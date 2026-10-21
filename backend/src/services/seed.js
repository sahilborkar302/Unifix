/* Demo data for UNIFIX: real MB labs from the college, mixed PC statuses, complaints + history.
   Runs automatically on first start. Manual: `npm run seed` (from /backend)  |  `npm run seed:reset` wipes + reseeds. */
const mongoose = require('mongoose');
const env = require('../config/env');
const { User, Lab, Computer, Complaint, PcLog, Notification, Counter } = require('../models');
const { pad, defaultPriority } = require('../utils/helpers');

// small deterministic random generator -> same demo data every time
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_PASSWORD = 'password123';

// Seat maps. Row 1 = front of the room (near the faculty screen).
const RIGHT_COL = [13, 14, null, 15, 16, 17, 18, null, 19, 20, 21, null];
const LEFT_COL = Array.from({ length: 12 }, (_, i) => i + 1);

const gridCells = (rows, cols, count) =>
  Array.from({ length: count }, (_, i) => ({ number: i + 1, row: Math.floor(i / cols) + 1, col: (i % cols) + 1 }));

function twoColCells(leftArr, rightArr) {
  const cells = [];
  leftArr.forEach((n, i) => n && cells.push({ number: n, row: i + 1, col: 1 }));
  rightArr.forEach((n, i) => n && cells.push({ number: n, row: i + 1, col: 2 }));
  return cells;
}

const LABS = [
  { code: 'MB-407/408', name: 'Computer Lab MB-407/408', location: '4th Floor, Main Building', rows: 10, cols: 8, cells: gridCells(10, 8, 80) },
  { code: 'MB-407 B', name: 'Computer Lab MB-407 B', location: '4th Floor, Main Building', rows: 12, cols: 2, cells: twoColCells(RIGHT_COL, LEFT_COL) },
  { code: 'MB-408 B', name: 'Computer Lab MB-408 B', location: '4th Floor, Main Building', rows: 12, cols: 2, cells: twoColCells(LEFT_COL, RIGHT_COL) },
  { code: 'MB-409', name: 'Computer Lab MB-409', location: '4th Floor, Main Building', rows: 4, cols: 6, cells: gridCells(4, 6, 24) },
  { code: 'MB-414', name: 'Computer Lab MB-414', location: '4th Floor, Main Building', rows: 4, cols: 6, cells: gridCells(4, 6, 24) },
];

const PROBLEMS = [
  ['Monitor Problem', 'Screen flickers continuously and the display goes black after a few minutes.'],
  ['PC Not Starting', 'System does not start. Power button pressed but nothing happens.'],
  ['Keyboard Problem', 'Several keys are not responding, including the space bar.'],
  ['Mouse Problem', 'Mouse pointer freezes and the left click does not work.'],
  ['Internet Not Working', 'No internet connection, browser shows "No internet" even though others work.'],
  ['Software Problem', 'IDE crashes on launch and compiler is not found.'],
  ['Slow Computer', 'PC takes more than 10 minutes to boot and hangs while opening files.'],
  ['Operating System Problem', 'Windows stuck on update screen and restarts repeatedly.'],
];
const FIXES = [
  ['Power supply issue', 'Power cable replaced and system tested for 15 minutes.'],
  ['Loose display cable', 'Re-seated HDMI cable and replaced the faulty one.'],
  ['Faulty keyboard', 'Keyboard replaced with a new one.'],
  ['Dirty mouse sensor / worn mouse', 'Mouse replaced.'],
  ['LAN cable fault', 'Patch cord replaced and port re-tested.'],
  ['Corrupted software install', 'Software re-installed and verified.'],
  ['Low disk space and malware', 'Disk cleaned and system re-imaged.'],
];

const daysAgo = (d, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000);

async function seed() {
  console.log('[UNIFIX] Seeding demo data...');
  const rand = rng(2026);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  // ---------- users ----------
  const mk = (name, email, role, studentId) => User.create({ name, email, role, studentId, password: DEMO_PASSWORD });
  const admin = await mk('Mrs. Suchitra Sonawane', 'admin@college.edu', 'admin');
  const techs = [
    await mk('Sachin Sakhare', 'tech@college.edu', 'technician'),
    await mk('Rahul Sharma', 'rahul@college.edu', 'technician'),
    await mk('Priya Patel', 'priya@college.edu', 'technician'),
  ];
  const students = [
    await mk('Sachitanand Borkar', 'student@college.edu', 'student', 'STU2026001'),
    await mk('Ananya Roy', 'ananya@college.edu', 'student', 'STU2026002'),
    await mk('Omkar Jadhav', 'omkar@college.edu', 'student', 'STU2026003'),
    await mk('Sneha Kulkarni', 'sneha@college.edu', 'student', 'STU2026004'),
    await mk('Aditya Deshmukh', 'aditya@college.edu', 'student', 'STU2026005'),
  ];

  // ---------- labs + PCs ----------
  const logs = [];
  const complaints = [];
  let counter = 0;
  const nextId = () => `REPORT-${new Date().getFullYear()}-${pad(++counter, 6)}`;

  for (const L of LABS) {
    const lab = await Lab.create({ code: L.code, name: L.name, location: L.location, rows: L.rows, cols: L.cols });
    const created = await Computer.insertMany(
      L.cells.map((c) => ({ lab: lab._id, number: c.number, label: `PC-${pad(c.number)}`, row: c.row, col: c.col, specs: 'i5 / 16 GB / 512 GB SSD', status: 'WORKING' }))
    );
    created.sort((a, b) => a.number - b.number);

    for (const pc of created) {
      const base = { computer: pc._id, lab: lab._id, labCode: lab.code, pcLabel: pc.label };
      logs.push({ ...base, kind: 'created', status: 'WORKING', text: 'System installed and verified.', actorName: 'IT Support', createdAt: daysAgo(60) });

      const r = rand();
      const student = pick(students);
      const [ptype, pdesc] = pick(PROBLEMS);

      if (r > 0.95) {
        pc.status = 'NOT_AVAILABLE';
        logs.push({ ...base, kind: 'manual', status: 'NOT_AVAILABLE', text: 'Marked not available for hardware upgrade.', actorName: admin.name, createdAt: daysAgo(5) });
      } else if (r > 0.9) {
        pc.status = 'UNDER_MAINTENANCE';
        if (rand() < 0.4) {
          logs.push({ ...base, kind: 'manual', status: 'UNDER_MAINTENANCE', text: 'Sent for routine scheduled maintenance.', actorName: admin.name, createdAt: daysAgo(1) });
        } else {
          const tech = pick(techs);
          const reportId = nextId();
          const createdAt = daysAgo(2, 3);
          complaints.push({ reportId, student, pc, lab, ptype, pdesc, status: 'In Progress', tech, createdAt, startedAt: daysAgo(1, 2) });
          logs.push({ ...base, kind: 'report', status: 'NOT_WORKING', reportId, problem: `${ptype}: ${pdesc}`, text: `Problem reported (${reportId}) by ${student.name}: ${ptype}`, actorName: student.name, createdAt });
          logs.push({ ...base, kind: 'start', status: 'UNDER_MAINTENANCE', reportId, technicianName: tech.name, text: `${tech.name} started repair for ${reportId}. PC is under maintenance.`, actorName: tech.name, createdAt: daysAgo(1, 2) });
        }
      } else if (r > 0.82) {
        pc.status = 'NOT_WORKING';
        const reportId = nextId();
        const assigned = rand() < 0.35 ? pick(techs) : null;
        const createdAt = daysAgo(Math.floor(rand() * 3), Math.floor(rand() * 10));
        complaints.push({ reportId, student, pc, lab, ptype, pdesc, status: assigned ? 'Assigned' : 'Pending', tech: assigned, createdAt });
        logs.push({ ...base, kind: 'report', status: 'NOT_WORKING', reportId, problem: `${ptype}: ${pdesc}`, text: `Problem reported (${reportId}) by ${student.name}: ${ptype}`, actorName: student.name, createdAt });
      } else if (r < 0.07) {
        // healthy PC with a repaired problem in its history
        const reportId = nextId();
        const tech = pick(techs);
        const [diag, fix] = pick(FIXES);
        const createdAt = daysAgo(8 + Math.floor(rand() * 10));
        const resolvedAt = new Date(createdAt.getTime() + 86400000 * (1 + Math.floor(rand() * 2)));
        complaints.push({ reportId, student, pc, lab, ptype, pdesc, status: 'Resolved', tech, createdAt, resolvedAt, diag, fix });
        logs.push({ ...base, kind: 'report', status: 'NOT_WORKING', reportId, problem: `${ptype}: ${pdesc}`, text: `Problem reported (${reportId}) by ${student.name}: ${ptype}`, actorName: student.name, createdAt });
        logs.push({ ...base, kind: 'resolve', status: 'WORKING', reportId, problem: `${ptype}: ${pdesc}`, diagnosis: diag, solution: fix, technicianName: tech.name, repairDate: resolvedAt,
          text: `${reportId} resolved by ${tech.name}: ${fix}`, actorName: tech.name, createdAt: resolvedAt });
      }
      await pc.save();
    }
  }

  // The spec example: MB-409 / PC-07 does not start (for a nice first impression)
  // (already handled by random data above; nothing forced)

  // ---------- complaints ----------
  const docs = complaints.map((c) => {
    const tl = [{ status: 'Pending', note: 'Report submitted', by: c.student.name, at: c.createdAt }];
    if (c.tech) tl.push({ status: 'Assigned', note: `Assigned to ${c.tech.name}`, by: admin.name, at: new Date(c.createdAt.getTime() + 3600000) });
    if (c.startedAt) tl.push({ status: 'In Progress', note: 'Technician started working on the PC', by: c.tech.name, at: c.startedAt });
    if (c.status === 'Resolved') tl.push({ status: 'Resolved', note: c.fix, by: c.tech.name, at: c.resolvedAt });
    return {
      reportId: c.reportId, student: c.student._id, studentName: c.student.name, studentCode: c.student.studentId,
      lab: c.lab._id, labCode: c.lab.code, computer: c.pc._id, pcLabel: c.pc.label,
      problemType: c.ptype, description: c.pdesc, priority: defaultPriority(c.ptype), status: c.status,
      assignedTo: c.tech?._id, assignedToName: c.tech?.name, assignedAt: c.tech ? new Date(c.createdAt.getTime() + 3600000) : undefined,
      startedAt: c.startedAt, diagnosis: c.diag || '', resolution: c.fix || '', resolvedBy: c.status === 'Resolved' ? c.tech.name : undefined,
      resolvedAt: c.resolvedAt, pcStatusAfter: c.status === 'Resolved' ? 'WORKING' : undefined, timeline: tl, createdAt: c.createdAt,
    };
  });
  const inserted = await Complaint.insertMany(docs);
  await Counter.findOneAndUpdate({ _id: `report-${new Date().getFullYear()}` }, { seq: counter }, { upsert: true });

  const byReport = Object.fromEntries(inserted.map((c) => [c.reportId, c._id]));
  logs.forEach((l) => { if (l.reportId) l.complaint = byReport[l.reportId]; });
  await PcLog.insertMany(logs);

  // a few starter notifications
  await Notification.insertMany([
    { user: admin._id, type: 'info', message: 'Welcome to UNIFIX. Demo data has been loaded for all labs.' },
    { user: techs[0]._id, type: 'info', message: 'Welcome to UNIFIX. Your assigned complaints appear on the Workboard.' },
  ]);
  const mine = inserted.filter((c) => String(c.student) === String(students[0]._id));
  if (mine.length) {
    await Notification.insertMany(mine.slice(0, 3).map((c) => ({
      user: students[0]._id, complaint: c._id, reportId: c.reportId, type: c.status === 'Resolved' ? 'resolved' : 'info',
      message: `Your complaint ${c.reportId} is ${c.status.toLowerCase()}.`,
    })));
  }

  const [nl, np, nc] = await Promise.all([Lab.countDocuments(), Computer.countDocuments(), Complaint.countDocuments()]);
  console.log(`[UNIFIX] Seeded ${nl} labs, ${np} PCs, ${nc} complaints, ${await User.countDocuments()} users.`);
  console.log('         Logins (password for all: password123):');
  console.log('           admin@college.edu | tech@college.edu | student@college.edu');
}

async function seedIfEmpty() {
  const users = await User.countDocuments();
  if (users === 0) await seed();
}

async function reset() {
  await Promise.all([User, Lab, Computer, Complaint, PcLog, Notification, Counter].map((m) => m.deleteMany({})));
}

module.exports = { seedIfEmpty, seed, reset };

if (require.main === module) {
  (async () => {
    const connectDB = require('../config/db');
    await connectDB();
    if (process.argv.includes('--reset')) await reset();
    else if ((await User.countDocuments()) > 0) {
      console.log('[UNIFIX] Database already has data. Use `npm run seed:reset` to wipe and reseed.');
      return mongoose.disconnect();
    }
    await seed();
    await mongoose.disconnect();
  })().catch((e) => { console.error(e); process.exit(1); });
}
