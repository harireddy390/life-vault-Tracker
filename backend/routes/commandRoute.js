const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ScheduleBlock = require('../models/ScheduleBlock');
const WorkoutLog = require('../models/WorkoutLog');
const Task = require('../models/tasks');
const Habit = require('../models/habits');
const Progress = require('../models/Progress');
const Goal = require('../models/goals');
const LearningTopic = require('../models/LearningTopic');
const ActivityLog = require('../models/ActivityLog');
const WeeklyReflection = require('../models/WeeklyReflection');
const {
  getISTDateStr,
  getISTTimeString,
  getISTDayOfWeek,
  getISTCurrentDateTime,
  timeToMinutes,
  getBlockDurationMinutes,
} = require('../utils/istTime');

// ── DEFAULT USER ROUTINE TEMPLATE ─────────────────────────────────────────────
const DEFAULT_WEEKDAY_ROUTINE = [
  { title: 'Wake', startTime: '07:00', endTime: '07:05', category: 'routine', priority: 'high', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Sunlight', startTime: '07:05', endTime: '07:15', category: 'routine', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Hygiene', startTime: '07:15', endTime: '07:30', category: 'routine', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Meal preparation', startTime: '07:30', endTime: '07:45', category: 'routine', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Breakfast / preparation', startTime: '07:45', endTime: '08:30', category: 'routine', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Commute', startTime: '08:30', endTime: '09:00', category: 'routine', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'College', startTime: '09:00', endTime: '16:30', category: 'college', priority: 'high', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Commute back', startTime: '16:30', endTime: '17:00', category: 'routine', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Gym preparation', startTime: '17:00', endTime: '17:15', category: 'gym', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Warm-up', startTime: '17:15', endTime: '17:35', category: 'gym', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Gym', startTime: '17:35', endTime: '18:45', category: 'gym', priority: 'high', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Walk back', startTime: '18:45', endTime: '19:05', category: 'routine', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Cooking / shower', startTime: '19:05', endTime: '19:20', category: 'routine', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Dinner preparation', startTime: '19:20', endTime: '19:45', category: 'routine', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Academic work / coding', startTime: '19:45', endTime: '21:30', category: 'study', priority: 'high', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Buffer / prepare for next day', startTime: '21:30', endTime: '22:30', category: 'personal', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5] },
  { title: 'Lights out', startTime: '22:30', endTime: '23:00', category: 'rest', priority: 'high', daysOfWeek: [1, 2, 3, 4, 5] },
];

const DEFAULT_WEEKEND_ROUTINE = [
  { title: 'Wake', startTime: '07:00', endTime: '08:00', category: 'routine', priority: 'high', daysOfWeek: [0, 6] },
  { title: 'B.Tech coding/projects', startTime: '08:00', endTime: '12:00', category: 'study', priority: 'high', daysOfWeek: [0, 6] },
  { title: 'Grocery / meal preparation', startTime: '12:00', endTime: '14:00', category: 'routine', priority: 'medium', daysOfWeek: [0] },
  { title: 'Gym rest / recovery', startTime: '17:35', endTime: '18:45', category: 'rest', priority: 'medium', daysOfWeek: [0, 6] },
  { title: 'Lights out', startTime: '22:30', endTime: '23:00', category: 'rest', priority: 'high', daysOfWeek: [0, 6] },
];

/**
 * Auto-seeds initial user schedule blocks if user has none
 */
async function ensureUserScheduleSeeded(userId) {
  const count = await ScheduleBlock.countDocuments({ user: userId });
  if (count === 0) {
    const allTemplates = [
      ...DEFAULT_WEEKDAY_ROUTINE.map((b, i) => ({ ...b, user: userId, isRecurring: true, order: i })),
      ...DEFAULT_WEEKEND_ROUTINE.map((b, i) => ({ ...b, user: userId, isRecurring: true, order: i + 50 })),
    ];
    await ScheduleBlock.insertMany(allTemplates);
  }
}

// ── GET /api/command/today ───────────────────────────────────────────────────
// The core daily personal operating system state aggregator
router.get('/today', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    await ensureUserScheduleSeeded(userId);

    const istContext = getISTCurrentDateTime();
    const { dateStr, timeStr, dayOfWeek, formattedDate, greeting, currentMinutes } = istContext;

    // 1. Fetch Today's Schedule Blocks
    const scheduleQuery = {
      user: userId,
      $or: [
        { isRecurring: true, daysOfWeek: dayOfWeek },
        { isRecurring: false, date: dateStr },
      ],
    };

    const rawBlocks = await ScheduleBlock.find(scheduleQuery)
      .populate('linkedTask', 'text priority completed')
      .populate('linkedGoal', 'title category progress_percent')
      .populate('linkedLearning', 'title category progress_percent')
      .populate('linkedWorkout', 'workoutType durationMinutes completed')
      .lean();

    // Map and annotate blocks with runtime completion, duration, and status
    const blocks = rawBlocks.map((b) => {
      const isCompleted = (b.completedDates || []).includes(dateStr) || (!b.isRecurring && b.completed);
      const isSkipped = (b.skippedDates || []).includes(dateStr);
      const startMin = timeToMinutes(b.startTime);
      const endMin = timeToMinutes(b.endTime);
      const duration = getBlockDurationMinutes(b.startTime, b.endTime);

      let status = 'upcoming';
      if (isCompleted) {
        status = 'completed';
      } else if (isSkipped) {
        status = 'skipped';
      } else if (currentMinutes >= startMin && currentMinutes < endMin) {
        status = 'active';
      } else if (currentMinutes >= endMin) {
        status = 'past_due';
      }

      return {
        ...b,
        isCompleted,
        isSkipped,
        durationMinutes: duration,
        status,
        startMinutes: startMin,
        endMinutes: endMin,
      };
    });

    // Chronological order by start time
    blocks.sort((a, b) => a.startMinutes - b.startMinutes);

    // Identify current active block and next upcoming block
    const activeBlock = blocks.find((b) => b.status === 'active') || null;
    const nextBlock = blocks.find((b) => b.startMinutes > currentMinutes && !b.isCompleted && !b.isSkipped) || null;

    // Schedule Completion Metrics
    const totalBlocks = blocks.length;
    const completedBlocks = blocks.filter((b) => b.isCompleted).length;
    const scheduleScore = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 100;

    // 2. Fetch Tasks (Partitioned into Must Do, Should Do, Quick Wins, Overdue)
    const allTasks = await Task.find({ user: userId, active: true }).sort({ important: -1, createdAt: -1 }).lean();

    const mustDo = [];
    const shouldDo = [];
    const quickWins = [];
    const overdue = [];
    let completedTasksToday = 0;

    allTasks.forEach((t) => {
      if (t.completed) {
        // If completed today in IST
        const compDate = t.completedAt ? getISTDateStr(t.completedAt) : null;
        if (compDate === dateStr) completedTasksToday++;
      } else {
        // Check if overdue
        if (t.dueDate && t.dueDate < dateStr) {
          overdue.push(t);
        } else if (t.priority === 'high' || t.important) {
          mustDo.push(t);
        } else if (t.priority === 'low') {
          quickWins.push(t);
        } else {
          shouldDo.push(t);
        }
      }
    });

    const activeTasksCount = mustDo.length + shouldDo.length + quickWins.length + overdue.length;
    const totalTasksEvaluated = activeTasksCount + completedTasksToday;
    const taskScore = totalTasksEvaluated > 0 ? Math.round((completedTasksToday / totalTasksEvaluated) * 100) : 100;

    // 3. Fetch Habits and Today's Progress Records
    const habits = await Habit.find({ user: userId, active: true }).sort({ important: -1, createdAt: -1 }).lean();
    const todayProgress = await Progress.find({ user: userId, date: dateStr }).lean();
    const progressMap = new Map();
    todayProgress.forEach((p) => progressMap.set(p.task.toString(), p));

    const todayHabits = habits.map((h) => {
      const pr = progressMap.get(h._id.toString());
      return {
        _id: h._id,
        title: h.title,
        description: h.description || '',
        category: h.category || 'Personal',
        important: Boolean(h.important),
        isCompleted: Boolean(pr && pr.completed),
        completedAt: pr ? pr.completedAt : null,
      };
    });

    const totalHabits = todayHabits.length;
    const completedHabits = todayHabits.filter((h) => h.isCompleted).length;
    const habitScore = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 100;

    // 4. Fetch Workout Log for Today
    const todayWorkout = await WorkoutLog.findOne({ user: userId, date: dateStr }).lean();
    const isGymScheduled = blocks.some((b) => b.category === 'gym');
    const isRestDay = !isGymScheduled || dayOfWeek === 0 || dayOfWeek === 6; // Sunday/Weekend rest
    const workoutScore = todayWorkout ? 100 : isRestDay ? 100 : 0;

    // 5. Fetch Study & Learning Roadmap Snapshot
    const activeLearningTopic = await LearningTopic.findOne({ user: userId }).sort({ updatedAt: -1 }).lean();
    let currentStudyStep = null;
    if (activeLearningTopic && Array.isArray(activeLearningTopic.steps)) {
      currentStudyStep = activeLearningTopic.steps.find((s) => !s.isCompleted) || null;
    }
    const isStudyScheduled = blocks.some((b) => b.category === 'study');
    const isStudyCompleted = blocks.some((b) => b.category === 'study' && b.isCompleted);
    const studyScore = !isStudyScheduled ? 100 : isStudyCompleted ? 100 : 0;

    // 6. Fetch Active Goals Requiring Attention
    const activeGoals = await Goal.find({ user: userId, status: { $in: ['active', 'behind'] } })
      .sort({ priority: -1, target_date: 1 })
      .limit(4)
      .lean();

    // 7. Deterministic Explainable Daily Execution Score
    // Formula: Schedule (30%) + Tasks (25%) + Habits (20%) + Fitness (15%) + Study (10%)
    const weightedDailyScore = Math.round(
      scheduleScore * 0.30 +
      taskScore * 0.25 +
      habitScore * 0.20 +
      workoutScore * 0.15 +
      studyScore * 0.10
    );

    // 8. In-App Upcoming Reminder (if next block starts in 15 minutes)
    let upcomingReminder = null;
    if (nextBlock) {
      const minutesUntilNext = nextBlock.startMinutes - currentMinutes;
      if (minutesUntilNext > 0 && minutesUntilNext <= 15) {
        upcomingReminder = {
          message: `${nextBlock.title} starts in ${minutesUntilNext} minutes.`,
          blockTitle: nextBlock.title,
          startTime: nextBlock.startTime,
          endTime: nextBlock.endTime,
          minutesUntil: minutesUntilNext,
          category: nextBlock.category,
        };
      }
    }

    res.json({
      istContext,
      summary: {
        dailyScore: weightedDailyScore,
        scoreBreakdown: {
          schedule: { score: scheduleScore, weight: 30, completed: completedBlocks, total: totalBlocks },
          tasks: { score: taskScore, weight: 25, completed: completedTasksToday, total: totalTasksEvaluated },
          habits: { score: habitScore, weight: 20, completed: completedHabits, total: totalHabits },
          fitness: { score: workoutScore, weight: 15, isLogged: !!todayWorkout, isRestDay },
          study: { score: studyScore, weight: 10, isCompleted: isStudyCompleted },
        },
        activeBlock,
        nextBlock,
        upcomingReminder,
      },
      schedule: {
        date: dateStr,
        blocks,
        totalBlocks,
        completedBlocks,
      },
      tasks: {
        mustDo,
        shouldDo,
        quickWins,
        overdue,
        completedTodayCount: completedTasksToday,
      },
      habits: {
        items: todayHabits,
        totalHabits,
        completedHabits,
      },
      fitness: {
        todayWorkout,
        isGymScheduled,
        isRestDay,
      },
      learning: {
        activeTopic: activeLearningTopic,
        currentStep: currentStudyStep,
        isStudyCompleted,
      },
      goals: activeGoals,
    });
  } catch (err) {
    console.error('Command Center /today error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/command/schedule ────────────────────────────────────────────────
// Query schedule for any specific date
router.get('/schedule', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const dateStr = req.query.date || getISTDateStr();

    // Parse date into day of week
    const [y, m, d] = dateStr.split('-').map(Number);
    const queriedDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    const dayOfWeek = queriedDate.getUTCDay();

    const blocks = await ScheduleBlock.find({
      user: userId,
      $or: [
        { isRecurring: true, daysOfWeek: dayOfWeek },
        { isRecurring: false, date: dateStr },
      ],
    })
      .populate('linkedTask', 'text priority completed')
      .populate('linkedGoal', 'title category progress_percent')
      .lean();

    const annotated = blocks.map((b) => ({
      ...b,
      isCompleted: (b.completedDates || []).includes(dateStr) || (!b.isRecurring && b.completed),
      isSkipped: (b.skippedDates || []).includes(dateStr),
      durationMinutes: getBlockDurationMinutes(b.startTime, b.endTime),
      startMinutes: timeToMinutes(b.startTime),
    }));

    annotated.sort((a, b) => a.startMinutes - b.startMinutes);

    res.json({ date: dateStr, dayOfWeek, blocks: annotated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/command/schedule/weekly ─────────────────────────────────────────
// Returns all user schedule blocks grouped by day of week
router.get('/schedule/weekly', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const allBlocks = await ScheduleBlock.find({ user: userId })
      .populate('linkedTask', 'text priority completed')
      .populate('linkedGoal', 'title category progress_percent')
      .lean();

    const days = {
      0: [], // Sun
      1: [], // Mon
      2: [], // Tue
      3: [], // Wed
      4: [], // Thu
      5: [], // Fri
      6: [], // Sat
    };

    allBlocks.forEach((b) => {
      const duration = getBlockDurationMinutes(b.startTime, b.endTime);
      const startMin = timeToMinutes(b.startTime);
      const item = { ...b, durationMinutes: duration, startMinutes: startMin };

      if (b.isRecurring && Array.isArray(b.daysOfWeek)) {
        b.daysOfWeek.forEach((d) => {
          if (days[d]) days[d].push(item);
        });
      } else if (!b.isRecurring && b.date) {
        const [y, m, d] = b.date.split('-').map(Number);
        const parsedDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        if (days[parsedDay]) days[parsedDay].push(item);
      }
    });

    Object.keys(days).forEach((d) => {
      days[d].sort((a, b) => a.startMinutes - b.startMinutes);
    });

    res.json({ success: true, days, totalBlocks: allBlocks.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/command/schedule ───────────────────────────────────────────────
// Add new schedule block
router.post('/schedule', protect, async (req, res) => {
  try {
    const {
      title,
      description = '',
      startTime,
      endTime,
      daysOfWeek = [1, 2, 3, 4, 5],
      isRecurring = true,
      date = null,
      category = 'routine',
      priority = 'medium',
      linkedTask = null,
      linkedGoal = null,
      linkedLearning = null,
    } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ message: 'Title, startTime, and endTime are required' });
    }

    const block = await ScheduleBlock.create({
      user: req.user.id,
      title: title.trim(),
      description: description.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [1, 2, 3, 4, 5],
      isRecurring: Boolean(isRecurring),
      date: isRecurring ? null : (date || getISTDateStr()),
      category,
      priority,
      linkedTask: linkedTask || null,
      linkedGoal: linkedGoal || null,
      linkedLearning: linkedLearning || null,
    });

    res.status(201).json(block);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PUT /api/command/schedule/:id ────────────────────────────────────────────
// Edit schedule block
router.put('/schedule/:id', protect, async (req, res) => {
  try {
    const block = await ScheduleBlock.findOne({ _id: req.params.id, user: req.user.id });
    if (!block) return res.status(404).json({ message: 'Schedule block not found' });

    Object.assign(block, req.body);
    await block.save();

    res.json(block);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── DELETE /api/command/schedule/:id ─────────────────────────────────────────
router.delete('/schedule/:id', protect, async (req, res) => {
  try {
    const block = await ScheduleBlock.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!block) return res.status(404).json({ message: 'Schedule block not found' });
    res.json({ message: 'Block removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/command/schedule/:id/toggle ────────────────────────────────────
// Toggle block completion for a specific IST date
router.post('/schedule/:id/toggle', protect, async (req, res) => {
  try {
    const dateStr = req.body.date || getISTDateStr();
    const block = await ScheduleBlock.findOne({ _id: req.params.id, user: req.user.id });
    if (!block) return res.status(404).json({ message: 'Schedule block not found' });

    let isNowCompleted = false;
    if (block.isRecurring) {
      const idx = block.completedDates.indexOf(dateStr);
      if (idx >= 0) {
        block.completedDates.splice(idx, 1);
        isNowCompleted = false;
      } else {
        block.completedDates.push(dateStr);
        isNowCompleted = true;
      }
    } else {
      block.completed = !block.completed;
      isNowCompleted = block.completed;
    }

    await block.save();

    // Log Activity Event if completed
    if (isNowCompleted) {
      await ActivityLog.create({
        user: req.user.id,
        module: 'schedule',
        action_type: 'schedule_completed',
        intensity_weight: 1,
        date_key: dateStr,
        metadata: { blockId: block._id, title: block.title, category: block.category },
      }).catch(() => {});
    }

    res.json({ _id: block._id, isCompleted: isNowCompleted, date: dateStr });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/command/schedule/:id/skip ──────────────────────────────────────
// Skip block for a specific date
router.post('/schedule/:id/skip', protect, async (req, res) => {
  try {
    const dateStr = req.body.date || getISTDateStr();
    const block = await ScheduleBlock.findOne({ _id: req.params.id, user: req.user.id });
    if (!block) return res.status(404).json({ message: 'Schedule block not found' });

    const idx = block.skippedDates.indexOf(dateStr);
    let isSkipped = false;
    if (idx >= 0) {
      block.skippedDates.splice(idx, 1);
      isSkipped = false;
    } else {
      block.skippedDates.push(dateStr);
      isSkipped = true;
    }

    await block.save();
    res.json({ _id: block._id, isSkipped, date: dateStr });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/command/schedule/seed ──────────────────────────────────────────
// Reset or seed user's routine
router.post('/schedule/seed', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    await ScheduleBlock.deleteMany({ user: userId });

    const allTemplates = [
      ...DEFAULT_WEEKDAY_ROUTINE.map((b, i) => ({ ...b, user: userId, isRecurring: true, order: i })),
      ...DEFAULT_WEEKEND_ROUTINE.map((b, i) => ({ ...b, user: userId, isRecurring: true, order: i + 50 })),
    ];
    const created = await ScheduleBlock.insertMany(allTemplates);

    res.json({ message: 'Routine seeded successfully', count: created.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── FAST WORKOUT LOGGING ─────────────────────────────────────────────────────

// POST /api/command/workout
// Fast logging of exercises, sets, and reps
router.post('/workout', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const dateStr = req.body.date || getISTDateStr();
    const {
      workoutType = 'Push Workout',
      durationMinutes = 60,
      exercises = [],
      notes = '',
    } = req.body;

    if (!exercises || exercises.length === 0) {
      return res.status(400).json({ message: 'Please include at least one exercise' });
    }

    const log = await WorkoutLog.create({
      user: userId,
      date: dateStr,
      workoutType: workoutType.trim(),
      durationMinutes: Number(durationMinutes) || 60,
      exercises,
      notes: (notes || '').trim(),
      completed: true,
    });

    // Auto-complete today's gym schedule block if present!
    const todayGymBlock = await ScheduleBlock.findOne({
      user: userId,
      category: 'gym',
      $or: [
        { isRecurring: true, daysOfWeek: getISTDayOfWeek() },
        { isRecurring: false, date: dateStr },
      ],
    });

    if (todayGymBlock) {
      if (todayGymBlock.isRecurring && !todayGymBlock.completedDates.includes(dateStr)) {
        todayGymBlock.completedDates.push(dateStr);
        todayGymBlock.linkedWorkout = log._id;
        await todayGymBlock.save();
      } else if (!todayGymBlock.isRecurring) {
        todayGymBlock.completed = true;
        todayGymBlock.linkedWorkout = log._id;
        await todayGymBlock.save();
      }
    }

    // Record Activity Event in database
    const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
    await ActivityLog.create({
      user: userId,
      module: 'fitness',
      action_type: 'workout_completed',
      intensity_weight: 3,
      date_key: dateStr,
      metadata: {
        workoutType: log.workoutType,
        durationMinutes: log.durationMinutes,
        exercisesCount: exercises.length,
        totalSets,
      },
    }).catch(() => {});

    res.status(201).json({
      log,
      message: 'Workout saved successfully',
      stats: {
        durationMinutes: log.durationMinutes,
        exercisesCount: exercises.length,
        totalSets,
      },
    });
  } catch (err) {
    console.error('Workout logging error:', err);
    res.status(400).json({ message: err.message });
  }
});

// GET /api/command/workout/recent
// Get recent workout logs for exercise weight/reps memory
router.get('/workout/recent', protect, async (req, res) => {
  try {
    const logs = await WorkoutLog.find({ user: req.user.id }).sort({ date: -1, createdAt: -1 }).limit(10);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── TASK QUICK ACTIONS ───────────────────────────────────────────────────────

// PATCH /api/command/task/:id/toggle
router.patch('/task/:id/toggle', protect, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date() : null;
    await task.save();

    const dateStr = getISTDateStr();
    if (task.completed) {
      await ActivityLog.create({
        user: req.user.id,
        module: 'tasks',
        action_type: 'task_completed',
        intensity_weight: task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1,
        date_key: dateStr,
        metadata: { taskId: task._id, text: task.text, priority: task.priority },
      }).catch(() => {});
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/command/task/quick-add
router.post('/task/quick-add', protect, async (req, res) => {
  try {
    const { title, priority = 'medium', dueDate = null, important = false } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const task = await Task.create({
      user: req.user.id,
      text: title.trim(),
      priority,
      important: Boolean(important),
      startDate: getISTDateStr(),
      dueDate: dueDate || null,
      active: true,
      completed: false,
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── HABIT QUICK TOGGLE ───────────────────────────────────────────────────────

// POST /api/command/habit/:id/toggle
router.post('/habit/:id/toggle', protect, async (req, res) => {
  try {
    const dateStr = req.body.date || getISTDateStr();
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user.id });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    let progress = await Progress.findOne({ user: req.user.id, task: habit._id, date: dateStr });
    if (progress) {
      progress.completed = !progress.completed;
      progress.completedAt = progress.completed ? new Date() : null;
      await progress.save();
    } else {
      progress = await Progress.create({
        user: req.user.id,
        task: habit._id,
        date: dateStr,
        completed: true,
        completedAt: new Date(),
      });
    }

    if (progress.completed) {
      await ActivityLog.create({
        user: req.user.id,
        module: 'habits',
        action_type: 'habit_completed',
        intensity_weight: 1,
        date_key: dateStr,
        metadata: { habitId: habit._id, title: habit.title },
      }).catch(() => {});
    }

    res.json({ habitId: habit._id, completed: progress.completed, date: dateStr });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── WEEKLY REVIEW & REFLECTION ───────────────────────────────────────────────

// GET /api/command/review/weekly
router.get('/review/weekly', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const istContext = getISTCurrentDateTime(today);

    // Calculate start of current week (Monday)
    const d = new Date(today);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    const weekStartDate = getISTDateStr(monday);

    // 1. Existing Reflection for this week
    const reflection = await WeeklyReflection.findOne({ user: userId, week_start_date: weekStartDate });

    // 2. Aggregate actual 7-day stats
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStr = getISTDateStr(sevenDaysAgo);

    const [workoutsCount, completedTasksCount, habitCompletionsCount, scheduleActivitiesCount] = await Promise.all([
      WorkoutLog.countDocuments({ user: userId, date: { $gte: sevenDaysAgoStr } }),
      Task.countDocuments({ user: userId, completed: true, completedAt: { $gte: sevenDaysAgo } }),
      Progress.countDocuments({ user: userId, completed: true, date: { $gte: sevenDaysAgoStr } }),
      ActivityLog.countDocuments({ user: userId, module: 'schedule', date_key: { $gte: sevenDaysAgoStr } }),
    ]);

    res.json({
      weekStartDate,
      reflection,
      stats: {
        workoutsCount,
        completedTasksCount,
        habitCompletionsCount,
        scheduleActivitiesCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/command/review/weekly
router.post('/review/weekly', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      week_start_date,
      energy_rating = 7,
      productivity_rating = 7,
      top_wins = [],
      bottlenecks = '',
      key_focus_next_week,
    } = req.body;

    if (!key_focus_next_week || !key_focus_next_week.trim()) {
      return res.status(400).json({ message: 'Please specify your key focus for next week' });
    }

    const reflection = await WeeklyReflection.findOneAndUpdate(
      { user: userId, week_start_date },
      {
        energy_rating: Number(energy_rating),
        productivity_rating: Number(productivity_rating),
        top_wins: Array.isArray(top_wins) ? top_wins : [top_wins],
        bottlenecks: (bottlenecks || '').trim(),
        key_focus_next_week: key_focus_next_week.trim(),
      },
      { new: true, upsert: true }
    );

    res.status(201).json(reflection);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
