const mongoose = require('mongoose');
const Document = require('../models/documents');
const FamilyDocument = require('../models/FamilyDocument');
const HealthRecord = require('../models/HealthRecord');
const ScheduleBlock = require('../models/ScheduleBlock');
const Task = require('../models/tasks');
const Goal = require('../models/goals');
const VitalsLog = require('../models/VitalsLog');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');
const { getISTCurrentDateTime, formatTime24 } = require('../utils/istTime');

/**
 * Mask sensitive numbers (Aadhaar, Passport, PAN, credit card numbers)
 */
function maskSensitiveNumber(val) {
  if (!val) return '';
  const clean = String(val).trim();
  if (clean.length <= 4) return clean;
  const visible = clean.slice(-4);
  const masked = '•'.repeat(Math.max(4, clean.length - 4));
  return `${masked} ${visible}`;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Omni-search across Vault, Family, and Health repositories.
 * Resilient to category mismatches, plural forms, and natural language queries.
 */
async function searchAllDocuments(queryStr, categoryFilter, userId) {
  const rawQ = (queryStr || '').trim();
  const rawCat = (categoryFilter && categoryFilter.toLowerCase() !== 'all') ? categoryFilter.trim() : '';

  // Extract individual keywords (ignoring trivial stop words)
  const stopWords = new Set(['in', 'the', 'a', 'an', 'and', 'or', 'for', 'of', 'to', 'present', 'here', 'my', 'find', 'show', 'search', 'get', 'please']);
  const searchWords = new Set();

  if (rawQ) {
    rawQ.split(/[\s,._-]+/).forEach((w) => {
      const clean = w.toLowerCase().trim();
      if (clean.length > 1 && !stopWords.has(clean)) {
        searchWords.add(clean);
      }
    });
  }

  if (rawCat) {
    rawCat.split(/[\s,._-]+/).forEach((w) => {
      const clean = w.toLowerCase().trim();
      if (clean.length > 1 && !stopWords.has(clean)) {
        searchWords.add(clean);
      }
    });
  }

  // Build list of regex patterns for matching
  const regexList = [
    rawQ ? new RegExp(escapeRegex(rawQ), 'i') : null,
    rawCat ? new RegExp(escapeRegex(rawCat), 'i') : null,
    ...Array.from(searchWords).map((w) => new RegExp(escapeRegex(w), 'i')),
  ].filter(Boolean);

  const results = [];

  // Helper to build $or queries
  const isGeneric = regexList.length === 0 || (rawQ.toLowerCase() === 'vault' && !rawCat);

  // 1. Vault Documents
  try {
    const vQuery = { user: userId };
    if (!isGeneric) {
      const orClauses = [];
      regexList.forEach((r) => {
        orClauses.push({ originalName: r });
        orClauses.push({ category: r });
        orClauses.push({ notes: r });
        orClauses.push({ tags: r });
      });
      vQuery.$or = orClauses;
    }

    const vaultDocs = await Document.find(vQuery).sort({ createdAt: -1 }).limit(15).lean();

    vaultDocs.forEach((d) => {
      results.push({
        id: d._id.toString(),
        title: d.originalName,
        originalName: d.originalName,
        source: 'Vault',
        category: d.category || 'General',
        documentType: 'Vault Document',
        mimeType: d.mimeType || 'application/octet-stream',
        size: d.size || 0,
        createdAt: d.createdAt,
        previewUrl: `/api/documents/${d._id}/download`,
        downloadUrl: `/api/documents/${d._id}/download`,
        memberName: null,
        maskedId: null,
      });
    });
  } catch (err) {
    console.error('[aiToolService] Error searching vault documents:', err.message);
  }

  // 2. Family Documents
  try {
    const fQuery = { user: userId };
    if (!isGeneric) {
      const orClauses = [];
      regexList.forEach((r) => {
        orClauses.push({ title: r });
        orClauses.push({ document_type: r });
        orClauses.push({ document_number: r });
        orClauses.push({ notes: r });
        orClauses.push({ file_name: r });
      });
      fQuery.$or = orClauses;
    }

    const familyDocs = await FamilyDocument.find(fQuery)
      .populate('family_member', 'full_name relationship')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    familyDocs.forEach((d) => {
      results.push({
        id: d._id.toString(),
        title: d.title || d.file_name,
        originalName: d.file_name,
        source: 'Family',
        category: d.document_type || 'Family Record',
        documentType: d.document_type || 'Government_ID',
        mimeType: d.mime_type || 'application/pdf',
        size: d.file_size_bytes || 0,
        createdAt: d.createdAt,
        previewUrl: d.file_url,
        downloadUrl: d.file_url,
        memberName: d.family_member ? `${d.family_member.full_name} (${d.family_member.relationship})` : null,
        maskedId: d.document_number ? maskSensitiveNumber(d.document_number) : null,
      });
    });
  } catch (err) {
    console.error('[aiToolService] Error searching family documents:', err.message);
  }

  // 3. Health Records
  try {
    const hQuery = { user: userId };
    if (!isGeneric) {
      const orClauses = [];
      regexList.forEach((r) => {
        orClauses.push({ title: r });
        orClauses.push({ category: r });
        orClauses.push({ doctorOrFacility: r });
        orClauses.push({ originalName: r });
      });
      hQuery.$or = orClauses;
    }

    const healthDocs = await HealthRecord.find(hQuery).sort({ recordDate: -1, createdAt: -1 }).limit(15).lean();

    healthDocs.forEach((d) => {
      results.push({
        id: d._id.toString(),
        title: d.title,
        originalName: d.originalName,
        source: 'Health',
        category: d.category || 'Medical',
        documentType: `Medical (${d.category || 'record'})`,
        mimeType: d.mimeType || 'application/pdf',
        size: d.fileSizeBytes || 0,
        createdAt: d.recordDate || d.createdAt,
        previewUrl: `/api/health/records/${d._id}/download`,
        downloadUrl: `/api/health/records/${d._id}/download`,
        memberName: null,
        doctorOrFacility: d.doctorOrFacility || null,
        maskedId: null,
      });
    });
  } catch (err) {
    console.error('[aiToolService] Error searching health documents:', err.message);
  }

  // Fallback: If 0 results found and query was specific, do a broader single-word match or return user's recent docs
  if (results.length === 0 && (rawQ || rawCat)) {
    try {
      const fallbackDocs = await Document.find({ user: userId }).sort({ createdAt: -1 }).limit(6).lean();
      fallbackDocs.forEach((d) => {
        results.push({
          id: d._id.toString(),
          title: d.originalName,
          originalName: d.originalName,
          source: 'Vault',
          category: d.category || 'General',
          documentType: 'Vault Document',
          mimeType: d.mimeType || 'application/octet-stream',
          size: d.size || 0,
          createdAt: d.createdAt,
          previewUrl: `/api/documents/${d._id}/download`,
          downloadUrl: `/api/documents/${d._id}/download`,
          memberName: null,
          maskedId: null,
        });
      });
    } catch {}
  }

  return {
    query: queryStr,
    totalCount: results.length,
    results: results.slice(0, 15),
  };
}

/**
 * Normalizes time string to 24-hour "HH:mm" format.
 */
function normalizeTimeString(str, defaultVal = '09:00') {
  if (!str) return defaultVal;
  const clean = String(str).trim();

  // Match 12-hour format like "9:00 AM", "09:30pm"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const mins = match12[2];
    const modifier = match12[3] ? match12[3].toLowerCase() : null;

    if (modifier === 'pm' && hours < 12) hours += 12;
    if (modifier === 'am' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${mins}`;
  }

  // Match 24-hour format like "14:30" or "9:00"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const mins = match24[2];
    return `${String(hours).padStart(2, '0')}:${mins}`;
  }

  return defaultVal;
}

const DAY_NAME_MAP = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

/**
 * Resolves recurrence string to daysOfWeek array.
 * Supports numeric arrays ([1, 4]), string day names (["Monday", "Thursday"]),
 * and combined day strings ("Monday & Thursday", "Mon-Fri").
 */
function resolveDaysOfWeek(recurrence, daysOfWeek) {
  // If array of day names or numbers
  if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
    const resolved = daysOfWeek
      .map((d) => {
        if (typeof d === 'number') return d;
        const s = String(d).trim().toLowerCase();
        if (DAY_NAME_MAP[s] !== undefined) return DAY_NAME_MAP[s];
        const n = parseInt(s, 10);
        return isNaN(n) ? null : n;
      })
      .filter((d) => d !== null && d >= 0 && d <= 6);
    if (resolved.length > 0) {
      return Array.from(new Set(resolved)).sort((a, b) => a - b);
    }
  }

  // If daysOfWeek passed as a string like "Monday & Thursday" or "Mon, Thu"
  if (typeof daysOfWeek === 'string' && daysOfWeek.trim()) {
    const tokens = daysOfWeek.toLowerCase().split(/[\s,&/+-]+/);
    const resolved = [];
    tokens.forEach((t) => {
      const clean = t.trim();
      if (DAY_NAME_MAP[clean] !== undefined) {
        resolved.push(DAY_NAME_MAP[clean]);
      }
    });
    if (resolved.length > 0) {
      return Array.from(new Set(resolved)).sort((a, b) => a - b);
    }
  }

  const rec = (recurrence || '').toLowerCase();
  if (rec.includes('weekday') || rec === 'mon-fri') {
    return [1, 2, 3, 4, 5];
  }
  if (rec.includes('weekend')) {
    return [0, 6];
  }
  if (rec.includes('daily') || rec.includes('everyday')) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  // Default to today's day of week
  const ist = getISTCurrentDateTime();
  return [ist.dayOfWeek];
}

/**
 * Tool Dispatcher & Execution Engine
 */
async function executeTool(toolName, args = {}, userId, isConfirmed = false) {
  switch (toolName) {
    // -------------------------------------------------------------
    // TOOL: vault_search_documents
    // -------------------------------------------------------------
    case 'vault_search_documents': {
      const { query, category } = args;
      const searchRes = await searchAllDocuments(query, category, userId);
      return {
        status: 'executed',
        toolName,
        response: searchRes,
      };
    }

    // -------------------------------------------------------------
    // TOOL: schedule_create_block
    // -------------------------------------------------------------
    case 'schedule_create_block': {
      const { title, startTime, endTime, category, recurrence, daysOfWeek, color } = args;
      if (!title) throw new Error('title is required for schedule block.');

      const normStart = normalizeTimeString(startTime, '09:00');
      const normEnd = normalizeTimeString(endTime, '10:00');
      const resolvedDays = resolveDaysOfWeek(recurrence, daysOfWeek);

      const block = await ScheduleBlock.create({
        user: userId,
        title: title.trim(),
        category: category || 'personal',
        startTime: normStart,
        endTime: normEnd,
        daysOfWeek: resolvedDays,
        isRecurring: resolvedDays.length > 0,
        color: color || '#6366F1',
      });

      // Audit log
      try {
        await ActivityLog.create({
          user: userId,
          module: 'schedule',
          action: 'create',
          description: `Created schedule block: "${block.title}" (${normStart} - ${normEnd})`,
        });
      } catch {}

      return {
        status: 'executed',
        toolName,
        response: {
          success: true,
          block: {
            id: block._id,
            title: block.title,
            startTime: block.startTime,
            endTime: block.endTime,
            category: block.category,
            daysOfWeek: block.daysOfWeek,
          },
        },
      };
    }

    // -------------------------------------------------------------
    // TOOL: schedule_batch_create (Staged by default, executed upon confirmation)
    // -------------------------------------------------------------
    case 'schedule_batch_create': {
      const rawBlocks = Array.isArray(args.blocks) ? args.blocks : [];
      if (rawBlocks.length === 0) {
        throw new Error('No blocks provided in schedule batch.');
      }

      const normalizedBlocks = rawBlocks.map((b, idx) => ({
        tempId: `staged-${idx}-${Date.now()}`,
        title: (b.title || 'Routine Block').trim(),
        startTime: normalizeTimeString(b.startTime, '09:00'),
        endTime: normalizeTimeString(b.endTime, '10:00'),
        category: (b.category || 'study').toLowerCase(),
        daysOfWeek: resolveDaysOfWeek(b.recurrence, b.daysOfWeek),
        recurrence: b.recurrence || 'weekday',
        color: b.color || '#4F46E5',
      }));

      // If NOT yet confirmed by user, stage it!
      if (!isConfirmed) {
        return {
          status: 'staged',
          toolName,
          arguments: { blocks: normalizedBlocks },
          response: {
            staged: true,
            count: normalizedBlocks.length,
            blocks: normalizedBlocks,
            message: `Ready to add ${normalizedBlocks.length} blocks to your Command Center. Please review and approve below.`,
          },
        };
      }

      // If user has confirmed execution, write to MongoDB
      const createdDocs = await ScheduleBlock.insertMany(
        normalizedBlocks.map((b) => ({
          user: userId,
          title: b.title,
          category: b.category,
          startTime: b.startTime,
          endTime: b.endTime,
          daysOfWeek: b.daysOfWeek,
          isRecurring: true,
          color: b.color,
        }))
      );

      try {
        await ActivityLog.create({
          user: userId,
          module: 'schedule',
          action: 'create',
          description: `Bulk imported ${createdDocs.length} schedule blocks via Life AI`,
        });
      } catch {}

      return {
        status: 'executed',
        toolName,
        response: {
          success: true,
          count: createdDocs.length,
          blocks: createdDocs.map((c) => ({
            id: c._id,
            title: c.title,
            startTime: c.startTime,
            endTime: c.endTime,
            category: c.category,
            daysOfWeek: c.daysOfWeek,
          })),
          message: `Successfully added ${createdDocs.length} schedule blocks to Command Center!`,
        },
      };
    }

    // -------------------------------------------------------------
    // TOOL: tasks_create
    // -------------------------------------------------------------
    case 'tasks_create': {
      const { title, priority, dueDate, category, estimatedMinutes, important } = args;
      if (!title) throw new Error('title is required to create a task.');

      const task = await Task.create({
        user: userId,
        text: title.trim(),
        priority: (priority || 'medium').toLowerCase(),
        important: Boolean(important || priority === 'high'),
        startDate: getISTCurrentDateTime().dateStr,
        dueDate: dueDate ? String(dueDate).slice(0, 10) : null,
        active: true,
        completed: false,
      });

      try {
        await ActivityLog.create({
          user: userId,
          module: 'tasks',
          action: 'create',
          description: `Created task via Life AI: "${task.text}" [${task.priority.toUpperCase()}]`,
        });
      } catch {}

      return {
        status: 'executed',
        toolName,
        response: {
          success: true,
          task: {
            id: task._id,
            text: task.text,
            priority: task.priority,
            dueDate: task.dueDate,
            category: task.category,
          },
          message: `Task created: "${task.text}" [${task.priority.toUpperCase()}]`,
        },
      };
    }

    // -------------------------------------------------------------
    // TOOL: goals_log_progress
    // -------------------------------------------------------------
    case 'goals_log_progress': {
      const { goalId, goalTitle, incrementValue, note } = args;
      let goal = null;

      if (goalId && mongoose.isValidObjectId(goalId)) {
        goal = await Goal.findOne({ _id: goalId, user: userId });
      } else if (goalTitle) {
        goal = await Goal.findOne({
          user: userId,
          title: { $regex: goalTitle.trim(), $options: 'i' },
        });
      }

      if (!goal) {
        throw new Error(`Could not find an active goal matching "${goalId || goalTitle}"`);
      }

      const inc = Number(incrementValue) || 1;
      goal.currentValue = Math.min(goal.targetValue, (goal.currentValue || 0) + inc);
      if (goal.currentValue >= goal.targetValue) {
        goal.status = 'completed';
      }
      await goal.save();

      return {
        status: 'executed',
        toolName,
        response: {
          success: true,
          goal: {
            id: goal._id,
            title: goal.title,
            currentValue: goal.currentValue,
            targetValue: goal.targetValue,
            unit: goal.unit,
            status: goal.status,
          },
          message: `Progress logged for "${goal.title}": ${goal.currentValue}/${goal.targetValue} ${goal.unit || ''}`,
        },
      };
    }

    // -------------------------------------------------------------
    // TOOL: health_log_vital
    // -------------------------------------------------------------
    case 'health_log_vital': {
      const { metricType, valuePrimary, valueSecondary, unit } = args;
      if (!metricType || valuePrimary === undefined) {
        throw new Error('metricType and valuePrimary are required.');
      }

      const validMetrics = ['blood_pressure', 'heart_rate', 'glucose', 'spo2'];
      const mType = metricType.toLowerCase();
      if (!validMetrics.includes(mType)) {
        throw new Error(`Invalid metricType. Must be one of: ${validMetrics.join(', ')}`);
      }

      const pVal = Number(valuePrimary);
      const sVal = valueSecondary !== undefined ? Number(valueSecondary) : null;

      let statusFlag = 'normal';
      let defaultUnit = 'units';

      if (mType === 'blood_pressure') {
        defaultUnit = 'mmHg';
        if (pVal >= 180 || (sVal && sVal >= 120)) statusFlag = 'critical';
        else if (pVal >= 140 || (sVal && sVal >= 90)) statusFlag = 'elevated';
      } else if (mType === 'heart_rate') {
        defaultUnit = 'bpm';
        if (pVal > 150 || pVal < 40) statusFlag = 'critical';
        else if (pVal > 100 || pVal < 60) statusFlag = 'elevated';
      } else if (mType === 'glucose') {
        defaultUnit = 'mg/dL';
        if (pVal >= 300 || pVal < 50) statusFlag = 'critical';
        else if (pVal >= 140) statusFlag = 'elevated';
      } else if (mType === 'spo2') {
        defaultUnit = '%';
        if (pVal < 90) statusFlag = 'critical';
        else if (pVal < 95) statusFlag = 'elevated';
      }

      const vital = await VitalsLog.create({
        user: userId,
        metricType: mType,
        valuePrimary: pVal,
        valueSecondary: sVal,
        unit: unit || defaultUnit,
        statusFlag,
        loggedAt: new Date(),
      });

      return {
        status: 'executed',
        toolName,
        response: {
          success: true,
          vital: {
            id: vital._id,
            metricType: vital.metricType,
            valuePrimary: vital.valuePrimary,
            valueSecondary: vital.valueSecondary,
            unit: vital.unit,
            statusFlag: vital.statusFlag,
          },
          message: `Logged ${vital.metricType.replace('_', ' ')}: ${vital.valuePrimary}${vital.valueSecondary ? '/' + vital.valueSecondary : ''} ${vital.unit} [${vital.statusFlag.toUpperCase()}]`,
        },
      };
    }

    // -------------------------------------------------------------
    // TOOL: finance_add_transaction
    // -------------------------------------------------------------
    case 'finance_add_transaction': {
      const { title, amount, type, category, paymentMethod, notes } = args;
      if (!title || amount === undefined) {
        throw new Error('title and amount are required.');
      }

      const validCategories = [
        'Housing',
        'Food_Dining',
        'Transportation',
        'Utilities',
        'Entertainment',
        'Health',
        'Salary',
        'Investments',
        'Other',
      ];

      const transType = (type || 'expense').toLowerCase();
      let matchedCategory = 'Other';
      if (category) {
        const found = validCategories.find((c) => c.toLowerCase() === category.toLowerCase().replace(/[\s/&-]+/g, '_'));
        if (found) matchedCategory = found;
      }

      const transaction = await Transaction.create({
        user: userId,
        title: title.trim(),
        amount: Number(amount),
        type: ['income', 'expense', 'investment'].includes(transType) ? transType : 'expense',
        category: matchedCategory,
        payment_method: paymentMethod || 'UPI_BankTransfer',
        notes: (notes || '').trim(),
        transaction_date: new Date(),
      });

      return {
        status: 'executed',
        toolName,
        response: {
          success: true,
          transaction: {
            id: transaction._id,
            title: transaction.title,
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category,
          },
          message: `Recorded ${transaction.type}: ₹${transaction.amount.toLocaleString()} for "${transaction.title}" (${transaction.category})`,
        },
      };
    }

    default:
      throw new Error(`Unsupported tool: ${toolName}`);
  }
}

module.exports = {
  searchAllDocuments,
  executeTool,
  normalizeTimeString,
  resolveDaysOfWeek,
  maskSensitiveNumber,
};
