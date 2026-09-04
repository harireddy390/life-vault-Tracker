const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    date: { type: String, required: true }, // YYYY-MM-DD
    block: { type: String, enum: ['Morning', 'Afternoon', 'Evening'], required: true },
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Habit' }], // reference to habits/tasks
  },
  { timestamps: true }
);

module.exports = mongoose.models.Routine || mongoose.model('Routine', routineSchema);
