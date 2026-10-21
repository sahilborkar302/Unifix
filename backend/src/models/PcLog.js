const mongoose = require('mongoose');

// One row per event in a PC's life (reported, assigned, repaired, manual status change...)
const pcLogSchema = new mongoose.Schema(
  {
    computer: { type: mongoose.Schema.Types.ObjectId, ref: 'Computer', index: true },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
    labCode: String,
    pcLabel: String,
    kind: { type: String, enum: ['created', 'report', 'assign', 'start', 'resolve', 'reject', 'manual', 'edit'], required: true },
    status: String, // PC status after this event
    text: { type: String, required: true },
    problem: String,
    diagnosis: String,
    solution: String,
    technicianName: String,
    repairDate: Date,
    remarks: String,
    actorName: String,
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    reportId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('PcLog', pcLogSchema);
