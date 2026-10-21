const { z } = require('zod');
const { User, Complaint } = require('../models');
const AppError = require('../utils/AppError');
const { asyncHandler, escapeRegex, ROLES, OPEN_STATUS } = require('../utils/helpers');
const { passwordRule } = require('./authController');

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  role: z.enum(ROLES),
  studentId: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(20).optional(),
  password: passwordRule,
});
const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  password: passwordRule.optional(),
});

const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role && ROLES.includes(req.query.role)) filter.role = req.query.role;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { studentId: rx }];
  }
  res.json({ users: await User.find(filter).sort({ role: 1, name: 1 }).limit(500) });
});

// technicians + their open workload (for the assign dropdown)
const technicians = asyncHandler(async (_req, res) => {
  const techs = await User.find({ role: 'technician', isActive: true }).sort({ name: 1 }).lean();
  const load = await Complaint.aggregate([{ $match: { status: { $in: OPEN_STATUS }, assignedTo: { $ne: null } } }, { $group: { _id: '$assignedTo', n: { $sum: 1 } } }]);
  const map = Object.fromEntries(load.map((l) => [String(l._id), l.n]));
  res.json({ technicians: techs.map((t) => ({ id: String(t._id), name: t.name, email: t.email, openTasks: map[String(t._id)] || 0 })) });
});

const create = asyncHandler(async (req, res) => {
  const d = createSchema.parse(req.body);
  if (d.role !== 'student') delete d.studentId;
  else if (!d.studentId) throw new AppError('Student ID is required for students.', 400);
  const user = await User.create(d);
  res.status(201).json({ user });
});

const update = asyncHandler(async (req, res) => {
  const d = updateSchema.parse(req.body);
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  const self = String(user._id) === String(req.user._id);
  if (self && (d.isActive === false || (d.role && d.role !== 'admin'))) throw new AppError('You cannot deactivate or demote your own account.', 400);
  if (d.role && d.role !== user.role && user.role === 'technician') {
    const open = await Complaint.countDocuments({ assignedTo: user._id, status: { $in: OPEN_STATUS } });
    if (open) throw new AppError('This technician still has open tasks. Reassign them first.', 409);
  }
  if (d.isActive === false && user.role === 'technician') {
    const open = await Complaint.countDocuments({ assignedTo: user._id, status: { $in: OPEN_STATUS } });
    if (open) throw new AppError('This technician still has open tasks. Reassign them first.', 409);
  }
  Object.assign(user, d);
  await user.save();
  res.json({ user });
});

module.exports = { list, technicians, create, update };
