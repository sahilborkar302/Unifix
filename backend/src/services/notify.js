const { Notification, User } = require('../models');
const { emit } = require('./events');

async function notifyUsers(userIds, { message, type = 'info', complaint }) {
  const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!ids.length) return;
  await Notification.insertMany(
    ids.map((user) => ({ user, message, type, complaint: complaint?._id, reportId: complaint?.reportId }))
  );
  emit('notification', { message, type, reportId: complaint?.reportId }, { userIds: ids });
}

async function notifyAdmins(payload) {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  return notifyUsers(admins.map((a) => a._id), payload);
}

module.exports = { notifyUsers, notifyAdmins };
