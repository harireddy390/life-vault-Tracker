const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');

const FamilyMember = require('../models/FamilyMember');
const FamilyDocument = require('../models/FamilyDocument');
const FamilyEventRenewal = require('../models/FamilyEventRenewal');

// ─── Multer Setup for Family Document Uploads ─────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/family');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 52428800 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    cb(new Error('Only PDF and image files (PNG, JPG, JPEG, WEBP) are allowed'));
  },
});

// Helper for ownership check
function ownerCheck(doc, userId, res) {
  if (!doc) {
    res.status(404).json({ message: 'Record not found' });
    return false;
  }
  if (doc.user.toString() !== userId) {
    res.status(401).json({ message: 'Not authorized to access this record' });
    return false;
  }
  return true;
}

// =============================================================================
// FAMILY MEMBERS ROUTES
// =============================================================================

// GET /api/family/members (and legacy GET /api/family)
const getMembersHandler = async (req, res) => {
  try {
    const uid = req.user.id;
    const members = await FamilyMember.find({ user: uid }).sort({ is_emergency_contact: -1, createdAt: -1 });

    // Populate document counts and upcoming renewal counts
    const memberIds = members.map((m) => m._id);

    const [docCounts, renewalCounts] = await Promise.all([
      FamilyDocument.aggregate([
        { $match: { family_member: { $in: memberIds } } },
        { $group: { _id: '$family_member', count: { $sum: 1 } } },
      ]),
      FamilyEventRenewal.aggregate([
        { $match: { family_member: { $in: memberIds }, status: 'upcoming' } },
        { $group: { _id: '$family_member', count: { $sum: 1 } } },
      ]),
    ]);

    const docMap = {};
    docCounts.forEach((d) => { docMap[d._id.toString()] = d.count; });

    const renewalMap = {};
    renewalCounts.forEach((r) => { renewalMap[r._id.toString()] = r.count; });

    const decorated = members.map((m) => {
      const obj = m.toObject();
      obj.document_count = docMap[m._id.toString()] || 0;
      obj.renewal_count = renewalMap[m._id.toString()] || 0;
      return obj;
    });

    res.json(decorated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.get('/members', protect, getMembersHandler);
router.get('/', protect, getMembersHandler);

// POST /api/family/members (and legacy POST /api/family)
const createMemberHandler = async (req, res) => {
  try {
    const {
      full_name,
      name, // legacy fallback
      relationship,
      relation, // legacy fallback
      date_of_birth,
      gender,
      blood_group,
      phone_number,
      phone, // legacy fallback
      email,
      allergies,
      chronic_conditions,
      is_emergency_contact,
      avatar_url,
      notes,
    } = req.body;

    const memberName = full_name || name;
    const memberRel = relationship || relation;

    if (!memberName) return res.status(400).json({ message: 'Full name is required' });
    if (!memberRel) return res.status(400).json({ message: 'Relationship is required' });

    // Parse array if provided as comma-separated string or array
    const parsedAllergies = Array.isArray(allergies)
      ? allergies
      : typeof allergies === 'string' && allergies.trim()
      ? allergies.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const parsedConditions = Array.isArray(chronic_conditions)
      ? chronic_conditions
      : typeof chronic_conditions === 'string' && chronic_conditions.trim()
      ? chronic_conditions.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const member = await FamilyMember.create({
      user: req.user.id,
      full_name: memberName.trim(),
      relationship: memberRel,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : new Date('2000-01-01'),
      gender: gender || 'Prefer_Not_To_Say',
      blood_group: blood_group || 'Unknown',
      phone_number: (phone_number || phone || '').trim(),
      email: (email || '').trim(),
      allergies: parsedAllergies,
      chronic_conditions: parsedConditions,
      is_emergency_contact: Boolean(is_emergency_contact),
      avatar_url: avatar_url || null,
      notes: (notes || '').trim(),
    });

    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.post('/members', protect, createMemberHandler);
router.post('/', protect, createMemberHandler);

// PUT /api/family/members/:id
router.put('/members/:id', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);
    if (!ownerCheck(member, req.user.id, res)) return;

    const fields = [
      'full_name',
      'relationship',
      'date_of_birth',
      'gender',
      'blood_group',
      'phone_number',
      'email',
      'allergies',
      'chronic_conditions',
      'is_emergency_contact',
      'avatar_url',
      'notes',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        if (f === 'date_of_birth') member[f] = new Date(req.body[f]);
        else if (f === 'allergies' || f === 'chronic_conditions') {
          member[f] = Array.isArray(req.body[f])
            ? req.body[f]
            : typeof req.body[f] === 'string'
            ? req.body[f].split(',').map((s) => s.trim()).filter(Boolean)
            : [];
        } else if (f === 'is_emergency_contact') {
          member[f] = Boolean(req.body[f]);
        } else {
          member[f] = req.body[f];
        }
      }
    });

    await member.save();
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/family/members/:id (Cascades documents and renewals)
const deleteMemberHandler = async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);
    if (!ownerCheck(member, req.user.id, res)) return;

    // 1. Find and unlink all attached files
    const docs = await FamilyDocument.find({ family_member: member._id });
    docs.forEach((d) => {
      if (d.file_url) {
        const filePath = path.join(__dirname, '..', d.file_url.replace(/^[/\\]+/, ''));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });

    // 2. Cascade delete documents and renewals
    await Promise.all([
      FamilyDocument.deleteMany({ family_member: member._id }),
      FamilyEventRenewal.deleteMany({ family_member: member._id }),
    ]);

    // 3. Delete member
    await member.deleteOne();
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.delete('/members/:id', protect, deleteMemberHandler);
router.delete('/:id', protect, deleteMemberHandler);

// =============================================================================
// FAMILY DOCUMENTS ROUTES
// =============================================================================

// GET /api/family/documents (All documents for user, supports ?memberId=...&type=...)
router.get('/documents', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const { memberId, document_type, search } = req.query;

    const query = { user: uid };
    if (memberId && memberId !== 'All') query.family_member = memberId;
    if (document_type && document_type !== 'All') query.document_type = document_type;
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { document_number: { $regex: search.trim(), $options: 'i' } },
        { notes: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const docs = await FamilyDocument.find(query)
      .populate('family_member', 'full_name relationship')
      .sort({ createdAt: -1 });

    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/family/members/:id/documents
router.get('/members/:id/documents', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);
    if (!ownerCheck(member, req.user.id, res)) return;

    const docs = await FamilyDocument.find({
      user: req.user.id,
      family_member: req.params.id,
    }).sort({ createdAt: -1 });

    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Document upload handler (supports :id param or req.body.family_member)
const uploadDocHandler = async (req, res) => {
  try {
    const memberId = req.params.id || req.body.family_member;
    if (!memberId) {
      return res.status(400).json({ message: 'Family member ID is required' });
    }

    const member = await FamilyMember.findById(memberId);
    if (!ownerCheck(member, req.user.id, res)) return;

    if (!req.file) {
      return res.status(400).json({ message: 'File attachment is required' });
    }

    const { title, document_type, document_number, notes } = req.body;
    const file_url = `/uploads/family/${req.file.filename}`;
    const file_name = req.file.originalname;
    const docTitle = (title && title.trim()) ? title.trim() : file_name;
    const file_size_bytes = req.file.size;
    const mime_type = req.file.mimetype;

    const doc = await FamilyDocument.create({
      user: req.user.id,
      family_member: member._id,
      title: docTitle,
      document_type: document_type || 'Government_ID',
      document_number: (document_number || '').trim(),
      file_url,
      file_name,
      file_size_bytes,
      mime_type,
      notes: (notes || '').trim(),
    });

    const populated = await FamilyDocument.findById(doc._id).populate('family_member', 'full_name relationship');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.post('/members/:id/documents', protect, upload.single('file'), uploadDocHandler);
router.post('/documents', protect, upload.single('file'), uploadDocHandler);

// DELETE /api/family/documents/:docId
router.delete('/documents/:docId', protect, async (req, res) => {
  try {
    const doc = await FamilyDocument.findById(req.params.docId);
    if (!ownerCheck(doc, req.user.id, res)) return;

    if (doc.file_url) {
      const filePath = path.join(__dirname, '..', doc.file_url.replace(/^[/\\]+/, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await doc.deleteOne();
    res.json({ id: req.params.docId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================================================================
// FAMILY RENEWALS & MILESTONES ROUTES
// =============================================================================

// GET /api/family/renewals
router.get('/renewals', protect, async (req, res) => {
  try {
    const uid = req.user.id;
    const { memberId } = req.query;

    const query = { user: uid };
    if (memberId && memberId !== 'All') query.family_member = memberId;

    const renewals = await FamilyEventRenewal.find(query)
      .populate('family_member', 'full_name relationship')
      .sort({ due_date: 1 });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const decorated = renewals.map((r) => {
      const d = new Date(r.due_date);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));

      return {
        ...r.toObject(),
        days_until_due: diffDays,
        is_overdue: diffDays < 0 && r.status !== 'completed',
        is_due_soon: diffDays >= 0 && diffDays <= 30 && r.status !== 'completed',
      };
    });

    res.json(decorated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/family/renewals
router.post('/renewals', protect, async (req, res) => {
  try {
    const { family_member, title, due_date, notes } = req.body;
    if (!family_member) return res.status(400).json({ message: 'Family member is required' });
    if (!title) return res.status(400).json({ message: 'Renewal title is required' });
    if (!due_date) return res.status(400).json({ message: 'Due date is required' });

    const member = await FamilyMember.findById(family_member);
    if (!ownerCheck(member, req.user.id, res)) return;

    const renewal = await FamilyEventRenewal.create({
      user: req.user.id,
      family_member: member._id,
      title: title.trim(),
      due_date: new Date(due_date),
      notes: (notes || '').trim(),
    });

    const populated = await FamilyEventRenewal.findById(renewal._id).populate('family_member', 'full_name relationship');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/family/renewals/:id/toggle
router.patch('/renewals/:id/toggle', protect, async (req, res) => {
  try {
    const renewal = await FamilyEventRenewal.findById(req.params.id);
    if (!ownerCheck(renewal, req.user.id, res)) return;

    renewal.status = renewal.status === 'completed' ? 'upcoming' : 'completed';
    await renewal.save();

    const populated = await FamilyEventRenewal.findById(renewal._id).populate('family_member', 'full_name relationship');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/family/renewals/:id
router.delete('/renewals/:id', protect, async (req, res) => {
  try {
    const renewal = await FamilyEventRenewal.findById(req.params.id);
    if (!ownerCheck(renewal, req.user.id, res)) return;

    await renewal.deleteOne();
    res.json({ id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
