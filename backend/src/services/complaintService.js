const { Computer, Complaint, PcLog, Counter, User } = require('../models');
const AppError = require('../utils/AppError');
const { OPEN_STATUS, defaultPriority } = require('../utils/helpers');
const { emit } = require('./events');
const { notifyUsers, notifyAdmins } = require('./notify');

const STATUS_LABEL = {
  WORKING: 'Working', NOT_WORKING: 'Not Working', UNDER_MAINTENANCE: 'Under Maintenance', NOT_AVAILABLE: 'Not Available',
};

/* ---------------- PC status + history (single place that changes a PC colour) ---------------- */
async function setPcStatus(computer, status, log) {
  computer.status = status;
  computer.statusUpdatedAt = new Date();
  await computer.save();
  const entry = await PcLog.create({
    computer: computer._id,
    lab: computer.lab._id || computer.lab,
    labCode: log.labCode,
    pcLabel: computer.label,
    status,
    ...log,
  });
  emit('pc', { computerId: String(computer._id), labId: String(computer.lab._id || computer.lab), status });
  return entry;
}

const pushTimeline = (c, status, note, by) => c.timeline.push({ status, note, by, at: new Date() });

function broadcastComplaint(c) {
  emit('complaint', { id: String(c._id), reportId: c.reportId, status: c.status }, {
    userIds: [c.student, c.assignedTo],
    roles: ['admin'],
  });
}

const openCountForPc = (computerId, exceptId) =>
  Complaint.countDocuments({ computer: computerId, status: { $in: OPEN_STATUS }, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });

/* ---------------- 1. Student reports a problem ---------------- */
async function createComplaint(student, { computerId, problemType, description }, imagePath) {
  const computer = await Computer.findById(computerId).populate('lab');
  if (!computer) throw new AppError('That PC does not exist.', 404);

  const duplicate = await Complaint.findOne({ student: student._id, computer: computer._id, status: { $in: OPEN_STATUS } });
  if (duplicate) throw new AppError(`You already have an open report for this PC (${duplicate.reportId}).`, 409);

  const reportId = await Counter.nextReportId();
  const complaint = await Complaint.create({
    reportId,
    student: student._id,
    studentName: student.name,
    studentCode: student.studentId || student.email,
    lab: computer.lab._id,
    labCode: computer.lab.code,
    computer: computer._id,
    pcLabel: computer.label,
    problemType,
    description,
    image: imagePath || '',
    priority: defaultPriority(problemType),
    timeline: [{ status: 'Pending', note: 'Report submitted', by: student.name }],
  });

  // PC turns RED (only if it was healthy — don't override maintenance / not-available)
  if (computer.status === 'WORKING') {
    await setPcStatus(computer, 'NOT_WORKING', {
      labCode: computer.lab.code, kind: 'report', complaint: complaint._id, reportId,
      problem: `${problemType}: ${description}`, actorName: student.name,
      text: `Problem reported (${reportId}) by ${student.name}: ${problemType}`,
    });
  } else {
    await PcLog.create({
      computer: computer._id, lab: computer.lab._id, labCode: computer.lab.code, pcLabel: computer.label,
      kind: 'report', status: computer.status, complaint: complaint._id, reportId, actorName: student.name,
      problem: `${problemType}: ${description}`, text: `Another problem reported (${reportId}): ${problemType}`,
    });
  }

  await notifyAdmins({ type: 'new', complaint, message: `New complaint ${reportId}: ${computer.lab.code} / ${computer.label} — ${problemType}` });
  await notifyUsers([student._id], { type: 'info', complaint, message: `Your complaint ${reportId} has been received. IT support will assign a technician soon.` });
  broadcastComplaint(complaint);
  return complaint;
}

/* ---------------- 2. Admin assigns a technician ---------------- */
async function assignComplaint(complaint, admin, { technicianId, priority }) {
  if (!['Pending', 'Assigned'].includes(complaint.status)) {
    throw new AppError(`A ${complaint.status.toLowerCase()} complaint cannot be (re)assigned.`, 409);
  }
  const tech = await User.findOne({ _id: technicianId, role: 'technician', isActive: true });
  if (!tech) throw new AppError('Selected technician was not found.', 404);

  complaint.assignedTo = tech._id;
  complaint.assignedToName = tech.name;
  complaint.assignedAt = new Date();
  complaint.status = 'Assigned';
  if (priority) complaint.priority = priority;
  pushTimeline(complaint, 'Assigned', `Assigned to ${tech.name}`, admin.name);
  await complaint.save();

  await notifyUsers([complaint.student], { type: 'assigned', complaint, message: `Your complaint ${complaint.reportId} has been assigned to a technician (${tech.name}).` });
  await notifyUsers([tech._id], { type: 'assigned', complaint, message: `New task: ${complaint.reportId} — ${complaint.labCode} / ${complaint.pcLabel} (${complaint.problemType})` });
  broadcastComplaint(complaint);
  return complaint;
}

/* ---------------- 3. Technician accepts / starts work ---------------- */
async function startComplaint(complaint, actor) {
  if (complaint.status !== 'Assigned') throw new AppError('Only an assigned complaint can be started.', 409);
  complaint.status = 'In Progress';
  complaint.startedAt = new Date();
  pushTimeline(complaint, 'In Progress', 'Technician started working on the PC', actor.name);
  await complaint.save();

  const computer = await Computer.findById(complaint.computer);
  if (computer) {
    await setPcStatus(computer, 'UNDER_MAINTENANCE', {
      labCode: complaint.labCode, kind: 'start', complaint: complaint._id, reportId: complaint.reportId,
      technicianName: actor.name, actorName: actor.name,
      text: `${actor.name} started repair for ${complaint.reportId}. PC is under maintenance.`,
    });
  }
  await notifyUsers([complaint.student], { type: 'progress', complaint, message: `Your complaint ${complaint.reportId} is currently being worked on.` });
  await notifyAdmins({ type: 'progress', complaint, message: `${actor.name} started working on ${complaint.reportId}.` });
  broadcastComplaint(complaint);
  return complaint;
}

/* ---------------- 4. Technician saves diagnosis without closing ---------------- */
async function saveNotes(complaint, actor, { diagnosis, remarks }) {
  if (!['Assigned', 'In Progress'].includes(complaint.status)) throw new AppError('This complaint is already closed.', 409);
  if (diagnosis !== undefined) complaint.diagnosis = diagnosis;
  if (remarks !== undefined) complaint.remarks = remarks;
  pushTimeline(complaint, complaint.status, 'Diagnosis / remarks updated', actor.name);
  await complaint.save();
  broadcastComplaint(complaint);
  return complaint;
}

/* ---------------- 5. Resolve: PC -> GREEN, history saved ---------------- */
async function resolveComplaint(complaint, actor, { diagnosis, solution, remarks, pcStatusAfter = 'WORKING' }) {
  if (!OPEN_STATUS.includes(complaint.status)) throw new AppError('This complaint is already closed.', 409);

  complaint.status = 'Resolved';
  complaint.diagnosis = diagnosis ?? complaint.diagnosis;
  complaint.resolution = solution;
  complaint.remarks = remarks ?? complaint.remarks;
  complaint.resolvedBy = actor.name;
  complaint.resolvedAt = new Date();
  complaint.pcStatusAfter = pcStatusAfter;
  if (!complaint.assignedTo && actor.role === 'technician') {
    complaint.assignedTo = actor._id;
    complaint.assignedToName = actor.name;
  }
  pushTimeline(complaint, 'Resolved', solution, actor.name);
  await complaint.save();

  const computer = await Computer.findById(complaint.computer);
  if (computer) {
    // other open faults on the same PC keep it RED
    const others = await openCountForPc(computer._id, complaint._id);
    const finalStatus = pcStatusAfter === 'WORKING' && others > 0 ? 'NOT_WORKING' : pcStatusAfter;
    await setPcStatus(computer, finalStatus, {
      labCode: complaint.labCode, kind: 'resolve', complaint: complaint._id, reportId: complaint.reportId,
      problem: `${complaint.problemType}: ${complaint.description}`,
      diagnosis: complaint.diagnosis, solution, remarks: complaint.remarks,
      technicianName: complaint.assignedToName || actor.name, repairDate: complaint.resolvedAt, actorName: actor.name,
      text: `${complaint.reportId} resolved by ${actor.name}: ${solution}` + (others > 0 ? ` (PC still has ${others} other open report${others > 1 ? 's' : ''})` : ''),
    });
  }

  await notifyUsers([complaint.student], { type: 'resolved', complaint, message: `Your complaint ${complaint.reportId} has been resolved.` });
  await notifyAdmins({ type: 'resolved', complaint, message: `${complaint.reportId} resolved by ${actor.name} (${complaint.labCode} / ${complaint.pcLabel}).` });
  broadcastComplaint(complaint);
  return complaint;
}

/* ---------------- 6. Admin rejects (invalid / duplicate) ---------------- */
async function rejectComplaint(complaint, admin, { reason }) {
  if (!OPEN_STATUS.includes(complaint.status)) throw new AppError('This complaint is already closed.', 409);
  complaint.status = 'Rejected';
  complaint.rejectReason = reason;
  complaint.resolvedAt = new Date();
  complaint.resolvedBy = admin.name;
  pushTimeline(complaint, 'Rejected', reason, admin.name);
  await complaint.save();

  const computer = await Computer.findById(complaint.computer);
  if (computer) {
    const others = await openCountForPc(computer._id, complaint._id);
    if (others === 0 && ['NOT_WORKING', 'UNDER_MAINTENANCE'].includes(computer.status)) {
      await setPcStatus(computer, 'WORKING', {
        labCode: complaint.labCode, kind: 'reject', complaint: complaint._id, reportId: complaint.reportId, actorName: admin.name,
        text: `${complaint.reportId} rejected (${reason}). PC set back to Working.`,
      });
    }
  }
  await notifyUsers([complaint.student], { type: 'rejected', complaint, message: `Your complaint ${complaint.reportId} was closed: ${reason}` });
  if (complaint.assignedTo) await notifyUsers([complaint.assignedTo], { type: 'rejected', complaint, message: `${complaint.reportId} was cancelled by admin.` });
  broadcastComplaint(complaint);
  return complaint;
}

module.exports = {
  STATUS_LABEL, setPcStatus, createComplaint, assignComplaint, startComplaint, saveNotes, resolveComplaint, rejectComplaint,
};
