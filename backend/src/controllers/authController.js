const { z } = require('zod');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../utils/helpers');
const { signToken } = require('../middleware/auth');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(64)
  .regex(/[A-Za-z]/, 'Password must contain a letter.')
  .regex(/\d/, 'Password must contain a number.');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  studentId: z.string().trim().min(3, 'Enter your Student ID.').max(30),
  phone: z.string().trim().max(20).optional(),
  password,
});
const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or Student ID.'),
  password: z.string().min(1, 'Enter your password.'),
});
const profileSchema = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().max(20).optional() });
const passwordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password });

const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  // Public registration always creates a STUDENT. Staff accounts are created by an admin.
  const user = await User.create({ ...data, role: 'student' });
  res.status(201).json({ token: signToken(user), user });
});

const login = asyncHandler(async (req, res) => {
  const { identifier, password: pw } = loginSchema.parse(req.body);
  const id = identifier.toLowerCase();
  const user = await User.findOne({ $or: [{ email: id }, { studentId: identifier.toUpperCase() }] }).select('+password');
  if (!user || !(await user.comparePassword(pw))) throw new AppError('Incorrect email / Student ID or password.', 401);
  if (!user.isActive) throw new AppError('This account has been deactivated. Contact the IT admin.', 403);
  res.json({ token: signToken(user), user });
});

const me = (req, res) => res.json({ user: req.user });

const updateProfile = asyncHandler(async (req, res) => {
  const data = profileSchema.parse(req.body);
  req.user.name = data.name;
  req.user.phone = data.phone || '';
  await req.user.save();
  res.json({ user: req.user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = passwordSchema.parse(req.body);
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw new AppError('Current password is incorrect.', 400);
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated.' });
});

module.exports = { register, login, me, updateProfile, changePassword, passwordRule: password };
