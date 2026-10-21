const mongoose = require('mongoose');
const { COMPLAINT_STATUS, PRIORITY, PROBLEM_TYPES } = require('../utils/helpers');

const timelineSchema = new mongoose.Schema(
  {
    status: String,
    note: String,
    by: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, unique: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: String,
    studentCode: String,
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', index: true },
    labCode: { type: String, required: true },
    computer: { type: mongoose.Schema.Types.ObjectId, ref: 'Computer', index: true },
    pcLabel: { type: String, required: true },
    problemType: { type: String, enum: PROBLEM_TYPES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    image: { type: String, default: '' },
    priority: { type: String, enum: PRIORITY, default: 'Medium' },
    status: { type: String, enum: COMPLAINT_STATUS, default: 'Pending', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedToName: String,
    assignedAt: Date,
    startedAt: Date,
    diagnosis: { type: String, default: '' },
    resolution: { type: String, default: '' },
    remarks: { type: String, default: '' },
    rejectReason: { type: String, default: '' },
    resolvedBy: String,
    resolvedAt: Date,
    pcStatusAfter: String,
    timeline: [timelineSchema],
  },
  { timestamps: true }
);

complaintSchema.set('toJSON', {
  transform: (_d, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Complaint', complaintSchema);
