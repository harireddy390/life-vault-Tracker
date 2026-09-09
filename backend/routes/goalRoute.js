const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Goal = require('../models/goals');
const GoalMilestone = require('../models/GoalMilestone');
const GoalAttachment = require('../models/GoalAttachment');
const GoalCheckin = require('../models/GoalCheckin');
const { protect } = require('../middleware/authMiddleware');
const { upload, uploadDir } = require('../config/upload');

// Map legacy / lowercase categories to canonical enum
const normalizeCategory = (cat) => {
  if (!cat) return 'Personal_Development';
  const c = String(cat).toLowerCase().trim();
  if (c === 'career') return 'Career';
  if (c === 'finance') return 'Finance';
  if (c === 'health' || c === 'health_fitness' || c === 'fitness') return 'Health_Fitness';
  if (c === 'learning' || c === 'personal' || c === 'personal_development') return 'Personal_Development';
  if (c === 'travel') return 'Travel';
  if (c === 'other') return 'Other';
  return 'Other';
};

// Calculate goal metrics (progress %, days remaining, and pace)
const calculateGoalMetrics = (goalDoc, milestones = [], checkins = [], attachments = []) => {
  const goal = goalDoc.toObject ? goalDoc.toObject() : { ...goalDoc };
  const targetDate = goal.target_date ? new Date(goal.target_date) : new Date();
  const createdAt = goal.createdAt ? new Date(goal.createdAt) : new Date();
  const now = new Date();

  // 1. Progress percentage
  let progress_pct = 0;
  if (goal.goal_type === 'milestone' && milestones.length > 0) {
    const completedCount = milestones.filter((m) => m.is_completed).length;
    progress_pct = Math.round((completedCount / milestones.length) * 100);
  } else {
    const target = Number(goal.target_value) || 100;
    const current = Number(goal.current_value) || 0;
    progress_pct = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;
  }

  // 2. Days remaining
  const diffMs = targetDate.getTime() - now.getTime();
  const days_remaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // 3. Pace calculation: 'ahead' | 'on_track' | 'needs_attention' | 'falling_behind'
  let pace = 'on_track';
  if (goal.status === 'completed' || progress_pct >= 100) {
    pace = 'ahead';
  } else if (days_remaining < 0) {
    pace = 'falling_behind';
  } else {
    const totalSpanMs = Math.max(1000 * 60 * 60 * 24, targetDate.getTime() - createdAt.getTime());
    const elapsedMs = Math.max(0, now.getTime() - createdAt.getTime());
    const expectedPct = Math.min(100, (elapsedMs / totalSpanMs) * 100);
    const delta = progress_pct - expectedPct;

    if (delta >= 10) {
      pace = 'ahead';
    } else if (delta >= -10) {
      pace = 'on_track';
    } else if (delta >= -25) {
      pace = 'needs_attention';
    } else {
      pace = 'falling_behind';
    }
  }

  return {
    ...goal,
    id: goal._id.toString(),
    progress_pct,
    days_remaining,
    pace,
    milestones,
    checkins,
    attachments,
    // Aliases for camelCase legacy consumers
    targetValue: goal.target_value,
    currentValue: goal.current_value,
    targetDate: goal.target_date,
    goalType: goal.goal_type,
  };
};

// ============================================================================
// @route   GET /api/goals
// @desc    Fetch all goals with progress calculations, deadlines & milestones.
//          Supports ?category=...&status=...&priority=...
// ============================================================================
router.get('/', protect, async (req, res) => {
  try {
    const query = { user: req.user.id };

    if (req.query.category && req.query.category !== 'All') {
      const canonical = normalizeCategory(req.query.category);
      query.$or = [
        { category: canonical },
        { category: req.query.category },
        { category: req.query.category.toLowerCase() },
      ];
    }

    if (req.query.status && req.query.status !== 'All') {
      query.status = req.query.status;
    }

    if (req.query.priority && req.query.priority !== 'All') {
      query.priority = req.query.priority;
    }

    const goals = await Goal.find(query).sort({ createdAt: -1 });
    const goalIds = goals.map((g) => g._id);

    // Fetch related milestones, checkins, attachments in parallel
    const [allMilestones, allCheckins, allAttachments] = await Promise.all([
      GoalMilestone.find({ goal_id: { $in: goalIds }, user: req.user.id }).sort({ createdAt: 1 }),
      GoalCheckin.find({ goal_id: { $in: goalIds }, user: req.user.id }).sort({ created_at: -1 }),
      GoalAttachment.find({ goal_id: { $in: goalIds }, user: req.user.id }).sort({ uploaded_at: -1 }),
    ]);

    const enriched = goals.map((goal) => {
      const gMilestones = allMilestones.filter((m) => m.goal_id.toString() === goal._id.toString());
      const gCheckins = allCheckins.filter((c) => c.goal_id.toString() === goal._id.toString());
      const gAttachments = allAttachments.filter((a) => a.goal_id.toString() === goal._id.toString());
      return calculateGoalMetrics(goal, gMilestones, gCheckins, gAttachments);
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ message: error.message || 'Server error loading goals' });
  }
});

// ============================================================================
// @route   POST /api/goals
// @desc    Create a new goal with optional sub-milestones
// ============================================================================
router.post('/', protect, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      goal_type,
      target_date,
      current_value,
      target_value,
      unit,
      priority,
      milestones,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Please provide a goal title' });
    }

    const canonicalCategory = normalizeCategory(category);
    const type = ['numeric', 'milestone', 'habit_streak'].includes(goal_type)
      ? goal_type
      : 'numeric';

    const goal = await Goal.create({
      user: req.user.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: canonicalCategory,
      goal_type: type,
      target_date: target_date ? new Date(target_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      current_value: Number(current_value) || 0,
      target_value: Number(target_value) > 0 ? Number(target_value) : 100,
      unit: unit !== undefined ? unit : '%',
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      status: 'active',
    });

    // Create sub-milestones if provided
    let createdMilestones = [];
    if (Array.isArray(milestones) && milestones.length > 0) {
      const milestoneDocs = milestones
        .filter((m) => (typeof m === 'string' ? m.trim() : m?.title?.trim()))
        .map((m) => ({
          goal_id: goal._id,
          user: req.user.id,
          title: typeof m === 'string' ? m.trim() : m.title.trim(),
          target_value: typeof m === 'object' && m.target_value ? Number(m.target_value) : null,
          is_completed: false,
        }));

      if (milestoneDocs.length > 0) {
        createdMilestones = await GoalMilestone.insertMany(milestoneDocs);
      }
    }

    // If milestone goal type, adjust target value to milestone count
    if (type === 'milestone' && createdMilestones.length > 0) {
      goal.target_value = createdMilestones.length;
      goal.unit = 'steps';
      await goal.save();
    }

    const enriched = calculateGoalMetrics(goal, createdMilestones, [], []);
    res.status(201).json(enriched);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ message: error.message || 'Server error creating goal' });
  }
});

// ============================================================================
// @route   PUT /api/goals/:id
// @desc    Update goal metadata, deadline, values, priority, status
// ============================================================================
router.put('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this goal' });
    }

    const {
      title,
      description,
      category,
      goal_type,
      target_date,
      current_value,
      target_value,
      unit,
      priority,
      status,
    } = req.body;

    if (title !== undefined) goal.title = title.trim();
    if (description !== undefined) goal.description = description.trim();
    if (category !== undefined) goal.category = normalizeCategory(category);
    if (goal_type !== undefined) goal.goal_type = goal_type;
    if (target_date !== undefined) goal.target_date = new Date(target_date);
    if (unit !== undefined) goal.unit = unit;
    if (priority !== undefined) goal.priority = priority;

    if (target_value !== undefined) {
      goal.target_value = Number(target_value);
    }

    if (current_value !== undefined) {
      goal.current_value = Number(current_value);
      if (goal.current_value >= goal.target_value) {
        goal.status = 'completed';
        goal.completed_at = goal.completed_at || new Date();
      } else if (goal.status === 'completed' && goal.current_value < goal.target_value) {
        goal.status = 'active';
        goal.completed_at = null;
      }
    }

    if (status !== undefined) {
      goal.status = status;
      if (status === 'completed' && !goal.completed_at) {
        goal.completed_at = new Date();
      } else if (status !== 'completed') {
        goal.completed_at = null;
      }
    }

    await goal.save();

    const [milestones, checkins, attachments] = await Promise.all([
      GoalMilestone.find({ goal_id: goal._id, user: req.user.id }).sort({ createdAt: 1 }),
      GoalCheckin.find({ goal_id: goal._id, user: req.user.id }).sort({ created_at: -1 }),
      GoalAttachment.find({ goal_id: goal._id, user: req.user.id }).sort({ uploaded_at: -1 }),
    ]);

    const enriched = calculateGoalMetrics(goal, milestones, checkins, attachments);
    res.status(200).json(enriched);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ message: error.message || 'Server error updating goal' });
  }
});

// ============================================================================
// @route   POST /api/goals/:id/checkin
// @desc    Log incremental progress (+500, +2), record history, auto-complete
// ============================================================================
router.post('/:id/checkin', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const { logged_value, note } = req.body;
    const increment = Number(logged_value);
    if (isNaN(increment)) {
      return res.status(400).json({ message: 'Valid numerical progress increment is required' });
    }

    // Update goal value
    const newCurrentValue = Math.max(0, Number(goal.current_value || 0) + increment);
    goal.current_value = newCurrentValue;

    // Check completion
    const isNowCompleted = newCurrentValue >= goal.target_value;
    if (isNowCompleted && goal.status !== 'completed') {
      goal.status = 'completed';
      goal.completed_at = new Date();
    } else if (!isNowCompleted && goal.status === 'completed') {
      goal.status = 'active';
      goal.completed_at = null;
    }

    await goal.save();

    // Create checkin record
    const checkin = await GoalCheckin.create({
      goal_id: goal._id,
      user: req.user.id,
      logged_value: increment,
      note: note ? String(note).trim() : '',
    });

    const [milestones, checkins, attachments] = await Promise.all([
      GoalMilestone.find({ goal_id: goal._id, user: req.user.id }).sort({ createdAt: 1 }),
      GoalCheckin.find({ goal_id: goal._id, user: req.user.id }).sort({ created_at: -1 }),
      GoalAttachment.find({ goal_id: goal._id, user: req.user.id }).sort({ uploaded_at: -1 }),
    ]);

    const enriched = calculateGoalMetrics(goal, milestones, checkins, attachments);
    res.status(200).json({
      goal: enriched,
      checkin,
      completedJustNow: isNowCompleted,
    });
  } catch (error) {
    console.error('Error logging check-in:', error);
    res.status(500).json({ message: error.message || 'Server error logging check-in' });
  }
});

// ============================================================================
// @route   PATCH /api/goals/milestones/:milestoneId/toggle
// @desc    Toggle milestone complete/incomplete and dynamically update goal
// ============================================================================
router.patch('/milestones/:milestoneId/toggle', protect, async (req, res) => {
  try {
    const milestone = await GoalMilestone.findById(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    if (milestone.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    milestone.is_completed = !milestone.is_completed;
    milestone.completed_at = milestone.is_completed ? new Date() : null;
    await milestone.save();

    // Fetch parent goal and sibling milestones
    const goal = await Goal.findById(milestone.goal_id);
    let updatedGoalEnriched = null;

    if (goal) {
      const allMilestones = await GoalMilestone.find({ goal_id: goal._id, user: req.user.id });
      const completedCount = allMilestones.filter((m) => m.is_completed).length;

      if (goal.goal_type === 'milestone') {
        goal.current_value = completedCount;
        goal.target_value = allMilestones.length;
        if (completedCount === allMilestones.length && allMilestones.length > 0) {
          goal.status = 'completed';
          goal.completed_at = new Date();
        } else if (goal.status === 'completed' && completedCount < allMilestones.length) {
          goal.status = 'active';
          goal.completed_at = null;
        }
        await goal.save();
      }

      const [checkins, attachments] = await Promise.all([
        GoalCheckin.find({ goal_id: goal._id, user: req.user.id }).sort({ created_at: -1 }),
        GoalAttachment.find({ goal_id: goal._id, user: req.user.id }).sort({ uploaded_at: -1 }),
      ]);
      updatedGoalEnriched = calculateGoalMetrics(goal, allMilestones, checkins, attachments);
    }

    res.status(200).json({
      milestone,
      goal: updatedGoalEnriched,
    });
  } catch (error) {
    console.error('Error toggling milestone:', error);
    res.status(500).json({ message: error.message || 'Server error toggling milestone' });
  }
});

// ============================================================================
// @route   POST /api/goals/:id/milestones
// @desc    Add milestone to an existing goal
// ============================================================================
router.post('/:id/milestones', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (goal.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

    const { title, target_value } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'Milestone title is required' });

    const milestone = await GoalMilestone.create({
      goal_id: goal._id,
      user: req.user.id,
      title: title.trim(),
      target_value: target_value ? Number(target_value) : null,
      is_completed: false,
    });

    // Recalculate parent goal target value if milestone type
    if (goal.goal_type === 'milestone') {
      const allMilestones = await GoalMilestone.find({ goal_id: goal._id });
      goal.target_value = allMilestones.length;
      await goal.save();
    }

    const [milestones, checkins, attachments] = await Promise.all([
      GoalMilestone.find({ goal_id: goal._id, user: req.user.id }).sort({ createdAt: 1 }),
      GoalCheckin.find({ goal_id: goal._id, user: req.user.id }).sort({ created_at: -1 }),
      GoalAttachment.find({ goal_id: goal._id, user: req.user.id }).sort({ uploaded_at: -1 }),
    ]);

    res.status(201).json({
      milestone,
      goal: calculateGoalMetrics(goal, milestones, checkins, attachments),
    });
  } catch (error) {
    console.error('Error adding milestone:', error);
    res.status(500).json({ message: error.message || 'Server error adding milestone' });
  }
});

// ============================================================================
// @route   DELETE /api/goals/milestones/:milestoneId
// @desc    Delete a milestone
// ============================================================================
router.delete('/milestones/:milestoneId', protect, async (req, res) => {
  try {
    const milestone = await GoalMilestone.findById(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    if (milestone.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

    const goalId = milestone.goal_id;
    await milestone.deleteOne();

    const goal = await Goal.findById(goalId);
    let updatedGoalEnriched = null;
    if (goal) {
      const allMilestones = await GoalMilestone.find({ goal_id: goal._id, user: req.user.id });
      if (goal.goal_type === 'milestone') {
        const completed = allMilestones.filter((m) => m.is_completed).length;
        goal.current_value = completed;
        goal.target_value = Math.max(1, allMilestones.length);
        await goal.save();
      }
      const [checkins, attachments] = await Promise.all([
        GoalCheckin.find({ goal_id: goal._id, user: req.user.id }).sort({ created_at: -1 }),
        GoalAttachment.find({ goal_id: goal._id, user: req.user.id }).sort({ uploaded_at: -1 }),
      ]);
      updatedGoalEnriched = calculateGoalMetrics(goal, allMilestones, checkins, attachments);
    }

    res.status(200).json({ id: req.params.milestoneId, goal: updatedGoalEnriched });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ message: error.message || 'Server error deleting milestone' });
  }
});

// ============================================================================
// @route   POST /api/goals/:id/attachments
// @desc    Upload proof/certificate (PDF, PNG, JPG up to 50MB)
// ============================================================================
router.post('/:id/attachments', protect, upload.single('file'), async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No proof file uploaded' });
    }

    const attachment = await GoalAttachment.create({
      goal_id: goal._id,
      user: req.user.id,
      file_name: req.file.originalname,
      file_url: `/uploads/${req.file.filename}`,
      stored_name: req.file.filename,
      file_size_bytes: req.file.size,
      mime_type: req.file.mimetype,
      uploaded_at: new Date(),
    });

    const [milestones, checkins, attachments] = await Promise.all([
      GoalMilestone.find({ goal_id: goal._id, user: req.user.id }).sort({ createdAt: 1 }),
      GoalCheckin.find({ goal_id: goal._id, user: req.user.id }).sort({ created_at: -1 }),
      GoalAttachment.find({ goal_id: goal._id, user: req.user.id }).sort({ uploaded_at: -1 }),
    ]);

    res.status(201).json({
      attachment,
      goal: calculateGoalMetrics(goal, milestones, checkins, attachments),
    });
  } catch (error) {
    console.error('Error uploading goal attachment:', error);
    res.status(500).json({ message: error.message || 'Server error uploading proof file' });
  }
});

// ============================================================================
// @route   GET /api/goals/:id/attachments/:attachmentId/download
// @desc    Download proof file
// ============================================================================
router.get('/:id/attachments/:attachmentId/download', protect, async (req, res) => {
  try {
    const attachment = await GoalAttachment.findById(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });
    if (attachment.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized to download this file' });
    }

    const filePath = path.join(uploadDir, attachment.stored_name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File missing from storage' });
    }

    res.download(filePath, attachment.file_name);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ message: error.message || 'Server error downloading file' });
  }
});

// ============================================================================
// @route   DELETE /api/goals/attachments/:attachmentId
// @desc    Delete proof attachment file & record
// ============================================================================
router.delete('/attachments/:attachmentId', protect, async (req, res) => {
  try {
    const attachment = await GoalAttachment.findById(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });
    if (attachment.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized to delete this file' });
    }

    const goalId = attachment.goal_id;
    const filePath = path.join(uploadDir, attachment.stored_name);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Could not unlink physical file:', err.message);
      }
    }

    await attachment.deleteOne();

    const goal = await Goal.findById(goalId);
    let updatedGoalEnriched = null;
    if (goal) {
      const [milestones, checkins, attachments] = await Promise.all([
        GoalMilestone.find({ goal_id: goal._id, user: req.user.id }).sort({ createdAt: 1 }),
        GoalCheckin.find({ goal_id: goal._id, user: req.user.id }).sort({ created_at: -1 }),
        GoalAttachment.find({ goal_id: goal._id, user: req.user.id }).sort({ uploaded_at: -1 }),
      ]);
      updatedGoalEnriched = calculateGoalMetrics(goal, milestones, checkins, attachments);
    }

    res.status(200).json({ id: req.params.attachmentId, goal: updatedGoalEnriched });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: error.message || 'Server error deleting attachment' });
  }
});

// ============================================================================
// @route   DELETE /api/goals/:id
// @desc    Remove goal and cascade delete all milestones, checkins, attachments
// ============================================================================
router.delete('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this goal' });
    }

    const goalId = goal._id;

    // 1. Find all attachments and delete files on disk
    const attachments = await GoalAttachment.find({ goal_id: goalId });
    attachments.forEach((att) => {
      const filePath = path.join(uploadDir, att.stored_name);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn('Failed to delete file on disk:', err.message);
        }
      }
    });

    // 2. Cascade delete all child collections in DB
    await Promise.all([
      GoalMilestone.deleteMany({ goal_id: goalId }),
      GoalCheckin.deleteMany({ goal_id: goalId }),
      GoalAttachment.deleteMany({ goal_id: goalId }),
    ]);

    // 3. Delete the goal itself
    await goal.deleteOne();

    res.status(200).json({ id: req.params.id, message: 'Goal and all linked assets removed' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ message: error.message || 'Server error deleting goal' });
  }
});

module.exports = router;
