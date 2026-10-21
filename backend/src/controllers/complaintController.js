const { z } = require('zod');
const { Complaint, Computer } = require('../models');
const AppError = require('../utils/AppError');
const svc = require('../services/complaintService');
const { asyncHandler, escapeRegex, PROBLEM_TYPES, COMPLAINT_STATUS, PRIORITY } = require('../utils/helpers');

const createSchema = z.object({
  computerId: z.string().min(1, 'Select a PC.'),
  problemType: z.enum(PROBLEM_TYPES, { errorMap: () => ({ message: 'Select a problem type.' }) }),
  description: z.string().trim().min(10, 'Describe the problem in at least 10 characters.').max(1000),
});
const assignSchema = z.object({ technicianId: z.string().min(1, 'Select a technician.'), priority: z.enum(PRIORITY).optional() });
const notesSchema = z.object({ diagnosis: z.string().trim().max(500).optional(), remarks: z.string().trim().max(500).optional() });
const resolveSchema = z.object({
  diagnosis: z.string().trim().max(500).optional(),
  solution: z.string().trim().min(3, 'Describe the solution (what was fixed).').max(500),
  remarks: z.string().trim().max(500).optional(),
  pcStatusAfter: z.enum(['WORKING', 'NOT_AVAILABLE']).optional(),
});
const rejectSchema = z.object({ reason: z.string().trim().min(3, 'Give a reason.').max(300) });
const prioritySchema = z.object({ priority: z.enum(PRIORITY) });

// Role-based visibility: student -> own, technician -> assigned to them, admin -> all
function scopeFor(user) {
  if (user.role === 'student') return { student: user._id };
  if (user.role === 'technician') return { assignedTo: user._id };
  return {};
}

async function loadScoped(req) {
  const c = await Complaint.findById(req.params.id);
  if (!c) throw new AppError('Complaint not found.', 404);
  const { role, _id } = req.user;
  if (role === 'student' && String(c.student) !== String(_id)) throw new AppError('Complaint not found.', 404);
  if (role === 'technician' && String(c.assignedTo) !== String(_id)) throw new AppError('This complaint is not assigned to you.', 403);
  return c;
}

const create = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const complaint = await svc.createComplaint(req.user, data, req.file ? `/uploads/${req.file.filename}` : '');
  res.status(201).json({ message: 'Your problem has been reported successfully.', complaint });
});

const list = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = { ...scopeFor(req.user) };
  if (q.status && COMPLAINT_STATUS.includes(q.status)) filter.status = q.status;
  if (q.lab) filter.lab = q.lab;
  if (q.computer) filter.computer = q.computer;
  if (q.problemType && PROBLEM_TYPES.includes(q.problemType)) filter.problemType = q.problemType;
  if (q.priority && PRIORITY.includes(q.priority)) filter.priority = q.priority;
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(q.from);
    if (q.to) filter.createdAt.$lte = new Date(new Date(q.to).getTime() + 86399999);
  }
  if (q.q) {
    const rx = new RegExp(escapeRegex(String(q.q).trim()), 'i');
    filter.$or = [{ reportId: rx }, { labCode: rx }, { pcLabel: rx }, { studentCode: rx }, { studentName: rx }, { problemType: rx }, { description: rx }];
  }
  const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ complaints });
});

const get = asyncHandler(async (req, res) => res.json({ complaint: await loadScoped(req) }));

const assign = asyncHandler(async (req, res) => {
  const data = assignSchema.parse(req.body);
  const c = await Complaint.findById(req.params.id);
  if (!c) throw new AppError('Complaint not found.', 404);
  res.json({ complaint: await svc.assignComplaint(c, req.user, data) });
});

const setPriority = asyncHandler(async (req, res) => {
  const { priority } = prioritySchema.parse(req.body);
  const c = await Complaint.findById(req.params.id);
  if (!c) throw new AppError('Complaint not found.', 404);
  c.priority = priority;
  await c.save();
  res.json({ complaint: c });
});

const start = asyncHandler(async (req, res) => res.json({ complaint: await svc.startComplaint(await loadScoped(req), req.user) }));
const notes = asyncHandler(async (req, res) => res.json({ complaint: await svc.saveNotes(await loadScoped(req), req.user, notesSchema.parse(req.body)) }));
const resolve = asyncHandler(async (req, res) => res.json({ complaint: await svc.resolveComplaint(await loadScoped(req), req.user, resolveSchema.parse(req.body)) }));
const reject = asyncHandler(async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c) throw new AppError('Complaint not found.', 404);
  res.json({ complaint: await svc.rejectComplaint(c, req.user, rejectSchema.parse(req.body)) });
});

module.exports = { create, list, get, assign, setPriority, start, notes, resolve, reject };
