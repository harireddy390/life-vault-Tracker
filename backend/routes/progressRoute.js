const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/tasks');
const Progress = require('../models/Progress');
const { protect } = require('../middleware/authMiddleware');
const {
  formatDateKey,
  parseDateKey,
  addDays,
  isTaskScheduledOnDate,
  calculateStreaks,
  calculateTaskMetrics,
} = require('../services/streakService');

// Helper to validate YYYY-MM-DD
const isValidDateStr = (dateStr) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
};

// @route   GET /api/progress/date/:date
// @desc    Get all scheduled tasks and user completion records for a specific calendar date
router.get('/date/:date', protect, async (req, res) => {
  try {
    const { date } = req.params;
    if (!isValidDateStr(date)) {
      return res.status(400).json({ message: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    // Find all active tasks belonging to this user
    const tasks = await Task.find({ user: req.user.id, active: true }).sort({ important: -1, createdAt: -1 });

    // Filter tasks that are scheduled on this specific date
    const scheduledTasks = tasks.filter((t) => isTaskScheduledOnDate(t, date));

    // Find progress records for this user and date
    const progressRecords = await Progress.find({
      user: req.user.id,
      date,
    });

    const progressMap = new Map();
    progressRecords.forEach((pr) => {
      progressMap.set(pr.task.toString(), pr);
    });

    // Merge tasks with completion status
    const taskProgressList = scheduledTasks.map((t) => {
      const record = progressMap.get(t._id.toString());
      return {
        _id: t._id,
        progressId: record ? record._id : null,
        title: t.text,
        text: t.text,
        description: t.description || '',
        important: Boolean(t.important),
        frequency: t.frequency,
        daysOfWeek: t.daysOfWeek,
        startDate: t.startDate,
        endDate: t.endDate,
        reminderTime: t.reminderTime || '',
        priority: t.priority || 'medium',
        completed: record ? Boolean(record.completed) : false,
        completedAt: record ? record.completedAt : null,
      };
    });

    const totalScheduled = taskProgressList.length;
    const completedCount = taskProgressList.filter((t) => t.completed).length;
    const percentage = totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 0;
    const importantCount = taskProgressList.filter((t) => t.important).length;
    const importantCompletedCount = taskProgressList.filter((t) => t.important && t.completed).length;

    res.status(200).json({
      date,
      tasks: taskProgressList,
      summary: {
        totalScheduled,
        completedCount,
        percentage,
        importantCount,
        importantCompletedCount,
        allCompleted: totalScheduled > 0 && completedCount === totalScheduled,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/progress/month/:year/:month
// @desc    Get monthly overview and day-by-day stats for calendar view
router.get('/month/:year/:month', protect, async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10); // 1-12

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Invalid year or month' });
    }

    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    // Fetch user tasks
    const tasks = await Task.find({ user: req.user.id, active: true });

    // Fetch user progress for the month
    const progressRecords = await Progress.find({
      user: req.user.id,
      date: { $regex: `^${prefix}` },
    });

    // Group progress by date
    const progressByDate = {};
    progressRecords.forEach((pr) => {
      if (!progressByDate[pr.date]) {
        progressByDate[pr.date] = [];
      }
      progressByDate[pr.date].push(pr);
    });

    const days = [];
    let totalMonthCompleted = 0;
    let totalMonthScheduled = 0;
    let bestDayPercentage = 0;
    let activeDaysCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${prefix}-${dayStr}`;

      const scheduledForDay = tasks.filter((t) => isTaskScheduledOnDate(t, dateKey));
      const recordsForDay = progressByDate[dateKey] || [];
      const completedForDay = recordsForDay.filter((r) => r.completed).length;
      const scheduledCount = scheduledForDay.length;
      const percentage = scheduledCount > 0 ? Math.round((completedForDay / scheduledCount) * 100) : 0;

      if (completedForDay > 0) {
        activeDaysCount++;
      }

      if (percentage > bestDayPercentage) {
        bestDayPercentage = percentage;
      }

      totalMonthCompleted += completedForDay;
      totalMonthScheduled += scheduledCount;

      let status = 'none';
      if (percentage >= 80) status = 'high';
      else if (percentage > 0) status = 'partial';
      else if (scheduledCount === 0) status = 'empty';

      days.push({
        date: dateKey,
        day,
        totalScheduled: scheduledCount,
        completedCount: completedForDay,
        percentage,
        status,
      });
    }

    const averageCompletion = totalMonthScheduled > 0
      ? Math.round((totalMonthCompleted / totalMonthScheduled) * 100)
      : 0;

    // Get overall streaks
    const allUserProgress = await Progress.find({ user: req.user.id });
    const streaks = calculateStreaks(allUserProgress, tasks);

    res.status(200).json({
      year,
      month,
      days,
      overview: {
        totalCompletedTasks: totalMonthCompleted,
        totalScheduledTasks: totalMonthScheduled,
        averageCompletion,
        bestDayPercentage,
        activeDaysCount,
        currentStreak: streaks.currentStreak,
        bestStreak: streaks.bestStreak,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/progress/stats
// @desc    Get overall streaks and activity stats across all time
router.get('/stats', protect, async (req, res) => {
  try {
    const [tasks, progressRecords] = await Promise.all([
      Task.find({ user: req.user.id }),
      Progress.find({ user: req.user.id }),
    ]);

    const streakData = calculateStreaks(progressRecords, tasks);
    res.status(200).json(streakData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/progress/matrix
// @desc    Get multi-day matrix for habit tracking grid (habits x recent dates)
router.get('/matrix', protect, async (req, res) => {
  try {
    let { startDate, endDate, days = 7 } = req.query;

    const today = new Date();
    if (!endDate) {
      endDate = formatDateKey(today);
    }
    if (!startDate) {
      startDate = addDays(endDate, -(parseInt(days, 10) - 1));
    }

    // Generate list of dates in range
    const dates = [];
    let cur = startDate;
    while (cur <= endDate) {
      dates.push(cur);
      cur = addDays(cur, 1);
    }

    const tasks = await Task.find({ user: req.user.id, active: true }).sort({ important: -1, createdAt: -1 });

    const progressRecords = await Progress.find({
      user: req.user.id,
      date: { $gte: startDate, $lte: endDate },
    });

    const progressLookup = {};
    progressRecords.forEach((pr) => {
      const key = `${pr.task.toString()}_${pr.date}`;
      progressLookup[key] = pr.completed;
    });

    // Build matrix row for each task
    const matrix = tasks.map((task) => {
      const taskDays = {};
      let taskCompletedCount = 0;
      let taskScheduledCount = 0;

      dates.forEach((d) => {
        const isScheduled = isTaskScheduledOnDate(task, d);
        const isCompleted = Boolean(progressLookup[`${task._id.toString()}_${d}`]);
        if (isScheduled) {
          taskScheduledCount++;
          if (isCompleted) taskCompletedCount++;
        }
        taskDays[d] = {
          isScheduled,
          completed: isCompleted,
        };
      });

      const rate = taskScheduledCount > 0 ? Math.round((taskCompletedCount / taskScheduledCount) * 100) : 0;

      return {
        _id: task._id,
        title: task.text,
        description: task.description || '',
        important: Boolean(task.important),
        frequency: task.frequency,
        reminderTime: task.reminderTime || '',
        completionRate: rate,
        days: taskDays,
      };
    });

    res.status(200).json({
      startDate,
      endDate,
      dates,
      matrix,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/progress/task/:taskId/detail
// @desc    Get detailed individual habit analytics (score, streaks, heatmap history)
router.get('/task/:taskId/detail', protect, async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const task = await Task.findOne({ _id: taskId, user: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const progressRecords = await Progress.find({
      user: req.user.id,
      task: taskId,
    }).sort({ date: -1 });

    const metrics = calculateTaskMetrics(task, progressRecords);

    res.status(200).json({
      task,
      metrics,
      history: progressRecords,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/progress/toggle
// @desc    Toggle or set completion status for a specific task and calendar date
router.post('/toggle', protect, async (req, res) => {
  try {
    const { taskId, date, completed } = req.body;

    if (!taskId || !date) {
      return res.status(400).json({ message: 'taskId and date are required' });
    }
    if (!isValidDateStr(date)) {
      return res.status(400).json({ message: 'Invalid date format (expected YYYY-MM-DD)' });
    }

    // Verify task exists and belongs to user
    const task = await Task.findOne({ _id: taskId, user: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }

    // Determine target completed status
    let newCompletedStatus = true;
    if (typeof completed === 'boolean') {
      newCompletedStatus = completed;
    } else {
      // Toggle current status
      const existing = await Progress.findOne({
        user: req.user.id,
        task: taskId,
        date,
      });
      if (existing) {
        newCompletedStatus = !existing.completed;
      }
    }

    // Atomic upsert
    const progressRecord = await Progress.findOneAndUpdate(
      {
        user: req.user.id,
        task: taskId,
        date,
      },
      {
        completed: newCompletedStatus,
        completedAt: newCompletedStatus ? new Date() : null,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      message: 'Progress updated',
      progress: progressRecord,
      taskId,
      date,
      completed: newCompletedStatus,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/progress
// @desc    Create or update progress record
router.post('/', protect, async (req, res) => {
  try {
    const { taskId, date, completed = true } = req.body;

    if (!taskId || !date) {
      return res.status(400).json({ message: 'taskId and date are required' });
    }
    if (!isValidDateStr(date)) {
      return res.status(400).json({ message: 'Invalid date format (expected YYYY-MM-DD)' });
    }

    const task = await Task.findOne({ _id: taskId, user: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }

    const record = await Progress.findOneAndUpdate(
      { user: req.user.id, task: taskId, date },
      { completed: Boolean(completed), completedAt: completed ? new Date() : null },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/progress/:id
// @desc    Update progress record by ID
router.put('/:id', protect, async (req, res) => {
  try {
    const record = await Progress.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Progress record not found' });
    }
    if (record.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized to update this progress record' });
    }

    if (typeof req.body.completed === 'boolean') {
      record.completed = req.body.completed;
      record.completedAt = req.body.completed ? (record.completedAt || new Date()) : null;
    }

    await record.save();
    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
