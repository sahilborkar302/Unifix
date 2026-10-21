const { Lab, Computer, Complaint } = require('../models');
const { asyncHandler, OPEN_STATUS } = require('../utils/helpers');

const pcCounts = async () => {
  const rows = await Computer.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
  const m = Object.fromEntries(rows.map((r) => [r._id, r.n]));
  const working = m.WORKING || 0, notWorking = m.NOT_WORKING || 0, maintenance = m.UNDER_MAINTENANCE || 0, notAvailable = m.NOT_AVAILABLE || 0;
  const totalPcs = working + notWorking + maintenance + notAvailable;
  return { totalPcs, working, notWorking, maintenance, notAvailable, availability: totalPcs ? Math.round((working / totalPcs) * 100) : 0 };
};

// Public numbers for the home page
const publicStats = asyncHandler(async (_req, res) => {
  const [totalLabs, pcs, open, resolved] = await Promise.all([
    Lab.countDocuments(), pcCounts(),
    Complaint.countDocuments({ status: { $in: OPEN_STATUS } }), Complaint.countDocuments({ status: 'Resolved' }),
  ]);
  res.json({ totalLabs, ...pcs, openComplaints: open, resolvedComplaints: resolved });
});

// Admin dashboard (cards + chart data)
const adminDashboard = asyncHandler(async (_req, res) => {
  const [totalLabs, pcs, byStatusRows, byTypeRows, byLabRows, recent, trendRows] = await Promise.all([
    Lab.countDocuments(), pcCounts(),
    Complaint.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$problemType', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    Complaint.aggregate([{ $group: { _id: '$labCode', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 10 }]),
    Complaint.find().sort({ createdAt: -1 }).limit(6),
    Complaint.find({ createdAt: { $gte: new Date(Date.now() - 14 * 86400000) } }).select('createdAt resolvedAt status').lean(),
  ]);
  const st = Object.fromEntries(byStatusRows.map((r) => [r._id, r.n]));
  const complaints = {
    pending: st.Pending || 0, assigned: st.Assigned || 0, inProgress: st['In Progress'] || 0, resolved: st.Resolved || 0, rejected: st.Rejected || 0,
  };
  complaints.total = Object.values(complaints).reduce((a, b) => a + b, 0);

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    days.push({ key: d.toDateString(), date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), reported: 0, resolved: 0 });
  }
  trendRows.forEach((c) => {
    const r = days.find((d) => d.key === new Date(c.createdAt).toDateString());
    if (r) r.reported++;
    if (c.resolvedAt && c.status === 'Resolved') {
      const x = days.find((d) => d.key === new Date(c.resolvedAt).toDateString());
      if (x) x.resolved++;
    }
  });

  res.json({
    totalLabs, pcs, complaints,
    byType: byTypeRows.map((r) => ({ name: r._id, count: r.n })),
    byLab: byLabRows.map((r) => ({ name: r._id, count: r.n })),
    trend: days.map(({ key, ...rest }) => rest),
    recent,
  });
});

module.exports = { publicStats, adminDashboard };
