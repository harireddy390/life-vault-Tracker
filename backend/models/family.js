const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    name: { type: String, required: [true, 'Please add a name'], trim: true },
    relation: { type: String, required: [true, 'Please add a relation'], trim: true },
    phone: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FamilyMember', familyMemberSchema);
