const { z } = require('zod');
const { Computer, Complaint, PcLog } = require('../models');
const AppError = require('../utils/AppError');
const { asyncHandler, PC_STATUS, OPEN_STATUS } = require('../utils/helpers');
const { setPcStatus } = require('../services/complaintService');
const { emit } = require('../services/events');

// Public PC details: status + history. Student names are never exposed to the public.
const get = asyncHandler(async (req, res) => {
  const computer = await Computer.findById(req.params.id).populate('lab', 'code name').lean();
  if (!computer) throw new AppError('PC not found.', 404);
  const [logs, complaints] = await Promise.all([
    PcLog.find({ computer: computer._id }).sort({ createdAt: -1 }).limit(40).lean(),
    Complaint.find({ computer: computer._id }).sort({ createdAt: -1 }).limit(20)
      .select('reportId problemType description status priority assignedToName createdAt resolvedAt resolution').lean(),
  ]);
  const active = complaints.find((c) => OPEN_STATUS.includes(c.status));
  res.json({ computer: { ...computer, id: String(computer._id) }, logs, complaints, currentProblem: active ? `${active.problemType}: ${active.description}` : null });
});

const statusSchema = z.object({
  status: z.enum(PC_STATUS),
  note: z.string().trim().max(300).optional(),
  problem: z.string().trim().max(300).optional(),
  solution: z.string().trim().max(500).optional(),
  technicianName: z.string().trim().max(80).optional(),
  repairDate: z.coerce.date().optional(),
  remarks: z.string().trim().max(500).optional(),
});

// Admin / technician: manual status change (+ problem, solution, technician, repair date, remarks)
const updateStatus = asyncHandler(async (req, res) => {
  const d = statusSchema.parse(req.body);
  const computer = await Computer.findById(req.params.id).populate('lab', 'code');
  if (!computer) throw new AppError('PC not found.', 404);
  const from = computer.status;
  await setPcStatus(computer, d.status, {
    labCode: computer.lab.code, kind: 'manual', actorName: req.user.name,
    problem: d.problem, solution: d.solution, remarks: d.remarks, repairDate: d.repairDate,
    technicianName: d.technicianName || (req.user.role === 'technician' ? req.user.name : undefined),
    text: d.note || `${req.user.name} changed status: ${from.replace('_', ' ')} → ${d.status.replace('_', ' ')}`,
  });
  res.json({ computer });
});

const editSchema = z.object({ assetTag: z.string().trim().max(40).optional(), specs: z.string().trim().max(120).optional() });
const edit = asyncHandler(async (req, res) => {
  const d = editSchema.parse(req.body);
  const computer = await Computer.findByIdAndUpdate(req.params.id, d, { new: true });
  if (!computer) throw new AppError('PC not found.', 404);
  emit('pc', { computerId: String(computer._id), labId: String(computer.lab) });
  res.json({ computer });
});

const remove = asyncHandler(async (req, res) => {
  const computer = await Computer.findById(req.params.id);
  if (!computer) throw new AppError('PC not found.', 404);
  const open = await Complaint.countDocuments({ computer: computer._id, status: { $in: OPEN_STATUS } });
  if (open) throw new AppError(`${computer.label} has ${open} open complaint(s). Resolve or reject them first.`, 409);
  await PcLog.deleteMany({ computer: computer._id });
  await computer.deleteOne();
  emit('pc', { computerId: String(computer._id), labId: String(computer.lab) });
  res.json({ message: `${computer.label} removed.` });
});

module.exports = { get, updateStatus, edit, remove };
