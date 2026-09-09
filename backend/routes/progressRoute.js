const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Habit = require('../models/habits');
const Progress = require('../models/Progress');
const WeeklyReflection = require('../models/WeeklyReflection');
const LifeScoreSnapshot = require('../models/LifeScoreSnapshot');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');
const {
  formatDateKey,
  parseDateKey,
  addDays,
  isTaskScheduledOnDate,
  calculateStreaks,
  calculateTaskMetrics,
} = require('../services/streakService');
const {
  calculateLifeScores,
  logUserActivity,
  generate365Heatmap,
  generateVelocityData,
  generateExportSummary,
} = require('../services/analyticsService');

const isValidDateStr = (dateStr) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
};

// @route   GET /api/progress/date/:date
router.get('/date/:date', protect, async (req, res) => {
  try {
    const { date } = req.params;
    if (!isValidDateStr(date)) {
      return res.status(400).json({ message: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    const habits = await Habit.find({ user: req.user.id, active: true }).sort({ important: -1, createdAt: -1 });
    const scheduledHabits = habits.filter((h) => isTaskScheduledOnDate(h, date));

    const progressRecords = await Progress.find({ user: req.user.id, date });
    const progressMap = new Map();
    progressRecords.forEach((pr) => { progressMap.set(pr.task.toString(), pr); });

    const taskProgressList = scheduledHabits.map((h) => {
      const record = progressMap.get(h._id.toString());
      return {
        _id: h._id,
        progressId: record ? record._id : null,
        title: h.title,
        text: h.title,
        description: h.description || '',
        important: Boolean(h.important),
        frequency: h.frequency,
        daysOfWeek: h.daysOfWeek,
        startDate: h.startDate,
        endDate: h.endDate,
        reminderTime: h.reminderTime || '',
        type: h.type,
        targetValue: h.targetValue,
        targetUnit: h.targetUnit,
        category: h.category,
        completed: record ? Boolean(record.completed) : false,
        completedAt: record ? record.completedAt : null,
        amount: record ? record.amount : null,
        note: record ? record.note : '',
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
router.get('/month/:year/:month', protect, async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Invalid year or month' });
    }

    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    const habits = await Habit.find({ user: req.user.id, active: true });

    const progressRecords = await Progress.find({
      user: req.user.id,
      date: { $regex: `^${prefix}` },
    });

    const progressByDate = {};
    progressRecords.forEach((pr) => {
      if (!progressByDate[pr.date]) progressByDate[pr.date] = [];
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

      const scheduledForDay = habits.filter((h) => isTaskScheduledOnDate(h, dateKey));
      const recordsForDay = progressByDate[dateKey] || [];
      const completedForDay = recordsForDay.filter((r) => r.completed).length;
      const scheduledCount = scheduledForDay.length;
      const percentage = scheduledCount > 0 ? Math.round((completedForDay / scheduledCount) * 100) : 0;

      if (completedForDay > 0) activeDaysCount++;
      if (percentage > bestDayPercentage) bestDayPercentage = percentage;

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

    const allUserProgress = await Progress.find({ user: req.user.id });
    const streaks = calculateStreaks(allUserProgress, habits);

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
router.get('/stats', protect, async (req, res) => {
  try {
    const [habits, progressRecords] = await Promise.all([
      Habit.find({ user: req.user.id }),
      Progress.find({ user: req.user.id }),
    ]);

    const streakData = calculateStreaks(progressRecords, habits);
    res.status(200).json(streakData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/progress/matrix
router.get('/matrix', protect, async (req, res) => {
  try {
    let { startDate, endDate, days = 7 } = req.query;

    const today = new Date();
    if (!endDate) endDate = formatDateKey(today);
    if (!startDate) startDate = addDays(endDate, -(parseInt(days, 10) - 1));

    const dates = [];
    let cur = startDate;
    while (cur <= endDate) {
      dates.push(cur);
      cur = addDays(cur, 1);
    }

    const habits = await Habit.find({ user: req.user.id, active: true }).sort({ important: -1, createdAt: -1 });

    const progressRecords = await Progress.find({
      user: req.user.id,
      date: { $gte: startDate, $lte: endDate },
    });

    const progressLookup = {};
    progressRecords.forEach((pr) => {
      const key = `${pr.task.toString()}_${pr.date}`;
      progressLookup[key] = pr.completed;
    });

    const matrix = habits.map((habit) => {
      const taskDays = {};
      let taskCompletedCount = 0;
      let taskScheduledCount = 0;

      dates.forEach((d) => {
        const isScheduled = isTaskScheduledOnDate(habit, d);
        const isCompleted = Boolean(progressLookup[`${habit._id.toString()}_${d}`]);
        if (isScheduled) {
          taskScheduledCount++;
          if (isCompleted) taskCompletedCount++;
        }
        taskDays[d] = { isScheduled, completed: isCompleted };
      });

      const rate = taskScheduledCount > 0 ? Math.round((taskCompletedCount / taskScheduledCount) * 100) : 0;

      return {
        _id: habit._id,
        title: habit.title,
        description: habit.description || '',
        important: Boolean(habit.important),
        frequency: habit.frequency,
        reminderTime: habit.reminderTime || '',
        completionRate: rate,
        days: taskDays,
      };
    });

    res.status(200).json({ startDate, endDate, dates, matrix });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/progress/task/:taskId/detail
router.get('/task/:taskId/detail', protect, async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const habit = await Habit.findOne({ _id: taskId, user: req.user.id });
    if (!habit) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const progressRecords = await Progress.find({
      user: req.user.id,
      task: taskId,
    }).sort({ date: -1 });

    const metrics = calculateTaskMetrics(habit, progressRecords);

    res.status(200).json({ task: habit, metrics, history: progressRecords });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/progress/toggle
router.post('/toggle', protect, async (req, res) => {
  try {
    const { taskId, date, completed } = req.body;

    if (!taskId || !date) {
      return res.status(400).json({ message: 'taskId and date are required' });
    }
    if (!isValidDateStr(date)) {
      return res.status(400).json({ message: 'Invalid date format (expected YYYY-MM-DD)' });
    }

    const habit = await Habit.findOne({ _id: taskId, user: req.user.id });
    if (!habit) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }

    // Determine new completed status and amount based on habit type
    let newCompletedStatus = true;
    let amount = null;
    let note = '';
    if (habit.type === 'quantifiable') {
      // Expect amount and optional note in request body
      amount = typeof req.body.amount === 'number' ? req.body.amount : null;
      note = req.body.note || '';
      // If amount meets or exceeds target, consider completed
      if (amount !== null && habit.targetValue != null) {
        newCompletedStatus = amount >= habit.targetValue;
      } else {
        // Fallback to toggling based on existing record if amount not provided
        const existing = await Progress.findOne({ user: req.user.id, task: taskId, date });
        if (existing) {
          newCompletedStatus = !existing.completed;
          amount = existing.amount;
          note = existing.note;
        }
      }
    } else {
      // Binary habit – preserve existing toggle logic
      if (typeof completed === 'boolean') {
        newCompletedStatus = completed;
      } else {
        const existing = await Progress.findOne({ user: req.user.id, task: taskId, date });
        if (existing) newCompletedStatus = !existing.completed;
      }
    }

    const progressRecord = await Progress.findOneAndUpdate(
      { user: req.user.id, task: taskId, date },
      {
        completed: newCompletedStatus,
        completedAt: newCompletedStatus ? new Date() : null,
        amount: amount,
        note: note
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
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
router.post('/', protect, async (req, res) => {
  try {
    const { taskId, date, completed = true } = req.body;

    if (!taskId || !date) {
      return res.status(400).json({ message: 'taskId and date are required' });
    }
    if (!isValidDateStr(date)) {
      return res.status(400).json({ message: 'Invalid date format (expected YYYY-MM-DD)' });
    }

    const habit = await Habit.findOne({ _id: taskId, user: req.user.id });
    if (!habit) {
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

// @route   GET /api/progress/year/:year
router.get('/year/:year', protect, async (req, res) => {
  try {
    const year = Number(req.params.year);
    if (!year) {
      return res.status(400).json({ message: 'Invalid year' });
    }

    const firstDate = `${year}-01-01`;
    const lastDate = `${year}-12-31`;

    const allHabits = await Habit.find({ user: req.user.id });

    const records = await Progress.find({
      user: req.user.id,
      date: { $gte: firstDate, $lte: lastDate },
    });
    const recordsByDate = new Map();
    records.forEach((r) => {
      if (!recordsByDate.has(r.date)) recordsByDate.set(r.date, []);
      recordsByDate.get(r.date).push(r);
    });

    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));
    const days = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      const scheduled = allHabits.filter((h) => isTaskScheduledOnDate(h, dateStr));
      const dayRecords = recordsByDate.get(dateStr) || [];
      const completedCount = dayRecords.filter((r) => r.completed).length;
      const totalCount = scheduled.length;

      days.push({
        date: dateStr,
        completedCount,
        totalCount,
        percentage: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
      });
    }

    res.status(200).json({ year, days });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// Life Analytics & Progress Dashboard Endpoints
// ============================================================================

// @route   GET /api/progress/dashboard
// @desc    Holistic Life Score, domain breakdown, streak & momentum
router.get('/dashboard', protect, async (req, res) => {
  try {
    const dashboardData = await calculateLifeScores(req.user.id);
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Error loading analytics dashboard:', error);
    res.status(500).json({ message: error.message || 'Server error loading dashboard analytics' });
  }
});

// @route   GET /api/progress/heatmap
// @desc    365-day aggregated activity heatmap (intensity 0-4)
router.get('/heatmap', protect, async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    const heatmap = await generate365Heatmap(req.user.id, year);
    res.status(200).json(heatmap);
  } catch (error) {
    console.error('Error generating heatmap:', error);
    res.status(500).json({ message: error.message || 'Server error generating heatmap' });
  }
});

// @route   GET /api/progress/velocity-chart
// @desc    Progress velocity vs target deadline curve (30d / 60d / 90d)
router.get('/velocity-chart', protect, async (req, res) => {
  try {
    const range = req.query.range ? parseInt(req.query.range, 10) : 90;
    const velocityData = await generateVelocityData(req.user.id, range);
    res.status(200).json(velocityData);
  } catch (error) {
    console.error('Error generating velocity chart data:', error);
    res.status(500).json({ message: error.message || 'Server error generating velocity data' });
  }
});

// @route   GET /api/progress/reflections
// @desc    Paginated weekly reflections with search
router.get('/reflections', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search ? String(req.query.search).trim() : '';

    const query = { user: req.user.id };
    if (search) {
      query.$or = [
        { key_focus_next_week: { $regex: search, $options: 'i' } },
        { bottlenecks: { $regex: search, $options: 'i' } },
        { top_wins: { $elemMatch: { $regex: search, $options: 'i' } } },
      ];
    }

    const [reflections, total] = await Promise.all([
      WeeklyReflection.find(query)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      WeeklyReflection.countDocuments(query),
    ]);

    res.status(200).json({
      reflections,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      total,
    });
  } catch (error) {
    console.error('Error fetching reflections:', error);
    res.status(500).json({ message: error.message || 'Server error loading reflections' });
  }
});

// @route   POST /api/progress/reflections
// @desc    Save weekly retrospective & trigger momentum recalculation
router.post('/reflections', protect, async (req, res) => {
  try {
    const {
      week_start_date,
      energy_rating,
      productivity_rating,
      top_wins,
      bottlenecks,
      key_focus_next_week,
    } = req.body;

    if (!key_focus_next_week || !key_focus_next_week.trim()) {
      return res.status(400).json({ message: 'Key focus for next week is required' });
    }

    const weekStart = week_start_date || new Date().toISOString().split('T')[0];

    const reflection = await WeeklyReflection.create({
      user: req.user.id,
      week_start_date: weekStart,
      energy_rating: Math.min(10, Math.max(1, Number(energy_rating) || 7)),
      productivity_rating: Math.min(10, Math.max(1, Number(productivity_rating) || 7)),
      top_wins: Array.isArray(top_wins) ? top_wins.filter(Boolean) : [],
      bottlenecks: bottlenecks ? String(bottlenecks).trim() : '',
      key_focus_next_week: key_focus_next_week.trim(),
    });

    // Log user activity
    await logUserActivity(req.user.id, 'journal', 'weekly_reflection', 3, {
      reflectionId: reflection._id,
    });

    // Recalculate life scores immediately
    const updatedScores = await calculateLifeScores(req.user.id);

    res.status(201).json({
      reflection,
      life_scores: updatedScores,
      message: 'Weekly reflection recorded successfully',
    });
  } catch (error) {
    console.error('Error saving reflection:', error);
    res.status(500).json({ message: error.message || 'Server error saving reflection' });
  }
});

// @route   GET /api/progress/export-pdf
// @desc    Executive PDF/Printable audit report summary
router.get('/export-pdf', protect, async (req, res) => {
  try {
    const summary = await generateExportSummary(req.user.id);
    res.status(200).json(summary);
  } catch (error) {
    console.error('Error generating export summary:', error);
    res.status(500).json({ message: error.message || 'Server error generating export report' });
  }
});

module.exports = router;