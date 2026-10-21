const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../utils/helpers');

const signToken = (user) => jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

async function userFromToken(token) {
  const payload = jwt.verify(token, env.jwtSecret);
  const user = await User.findById(payload.id);
  if (!user || !user.isActive) return null;
  return user;
}

const readBearer = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
};

// Requires a valid token
const protect = asyncHandler(async (req, _res, next) => {
  const token = readBearer(req);
  if (!token) throw new AppError('Please log in to continue.', 401);
  let user;
  try {
    user = await userFromToken(token);
  } catch {
    throw new AppError('Your session has expired. Please log in again.', 401);
  }
  if (!user) throw new AppError('This account is no longer active.', 401);
  req.user = user;
  next();
});

// Role-based authorization: authorize('admin', 'technician')
const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to do this.', 403));
  }
  next();
};

module.exports = { signToken, protect, authorize, userFromToken };
