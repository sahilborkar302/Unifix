const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pad = (n, len = 2) => String(n).padStart(len, '0');
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const PC_STATUS = ['WORKING', 'NOT_WORKING', 'UNDER_MAINTENANCE', 'NOT_AVAILABLE'];
const COMPLAINT_STATUS = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
const OPEN_STATUS = ['Pending', 'Assigned', 'In Progress'];
const PRIORITY = ['Low', 'Medium', 'High'];
const PROBLEM_TYPES = [
  'PC Not Starting', 'Slow Computer', 'Internet Not Working', 'Keyboard Problem', 'Mouse Problem',
  'Monitor Problem', 'Software Problem', 'Operating System Problem', 'Network Problem', 'Other',
];
const ROLES = ['student', 'technician', 'admin'];

// problem type -> default priority
const defaultPriority = (type) => {
  if (['PC Not Starting', 'Operating System Problem'].includes(type)) return 'High';
  if (['Slow Computer', 'Keyboard Problem', 'Mouse Problem', 'Other'].includes(type)) return 'Low';
  return 'Medium';
};

module.exports = {
  escapeRegex, pad, asyncHandler, PC_STATUS, COMPLAINT_STATUS, OPEN_STATUS, PRIORITY, PROBLEM_TYPES, ROLES, defaultPriority,
};
