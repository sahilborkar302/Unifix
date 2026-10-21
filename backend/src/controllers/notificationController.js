const { Notification } = require('../models');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../utils/helpers');

const list = asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(60),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);
  res.json({ notifications: items, unread });
});
const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true }, { new: true });
  if (!n) throw new AppError('Notification not found.', 404);
  res.json({ notification: n });
});
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'All notifications marked as read.' });
});
const clearAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  res.json({ message: 'Notifications cleared.' });
});

module.exports = { list, markRead, markAllRead, clearAll };
