const { z } = require('zod');
const { Lab, Computer, Complaint, PcLog } = require('../models');
const AppError = require('../utils/AppError');
const { asyncHandler, pad, OPEN_STATUS } = require('../utils/helpers');
const { emit } = require('../services/events');

const labSchema = z.object({
  code: z.string().trim().min(2, 'Lab number is required.').max(30),
  name: z.string().trim().min(2, 'Lab name is required.').max(80),
  location: z.string().trim().max(80).optional().default(''),
  rows: z.coerce.number().int().min(1).max(20),
  cols: z.coerce.number().int().min(1).max(20),
  pcCount: z.coerce.number().int().min(0).max(400).optional(),
});

const labLabel = (n) => `PC-${pad(n, n > 99 ? 3 : 2)}`;

// Lab list with PC counts (counted in JS: a few hundred PCs at most, and it works on any MongoDB flavour)
async function labsWithCounts(filter = {}) {
  const labs = await Lab.find(filter).sort({ code: 1 }).lean();
  const pcs = await Computer.find(labs.length ? { lab: { $in: labs.map((l) => l._id) } } : { _id: null }).select('lab status statusUpdatedAt').lean();
  const map = {};
  labs.forEach((l) => {
    map[String(l._id)] = { ...l, id: String(l._id), totalPcs: 0, working: 0, notWorking: 0, maintenance: 0, notAvailable: 0, lastUpdated: l.updatedAt };
  });
  pcs.forEach((c) => {
    const l = map[String(c.lab)];
    if (!l) return;
    l.totalPcs += 1;
    if (c.status === 'WORKING') l.working += 1;
    else if (c.status === 'NOT_WORKING') l.notWorking += 1;
    else if (c.status === 'UNDER_MAINTENANCE') l.maintenance += 1;
    else if (c.status === 'NOT_AVAILABLE') l.notAvailable += 1;
    if (c.statusUpdatedAt && c.statusUpdatedAt > l.lastUpdated) l.lastUpdated = c.statusUpdatedAt;
  });
  return Object.values(map).map((l) => ({ ...l, availability: l.totalPcs ? Math.round((l.working / l.totalPcs) * 100) : 0 }));
}

const list = asyncHandler(async (_req, res) => res.json({ labs: await labsWithCounts() }));

const get = asyncHandler(async (req, res) => {
  const [lab] = await labsWithCounts({ _id: req.params.id });
  if (!lab) throw new AppError('Lab not found.', 404);
  const computers = await Computer.find({ lab: lab.id }).sort({ number: 1 }).lean();
  res.json({ lab, computers: computers.map((c) => ({ ...c, id: String(c._id) })) });
});

const create = asyncHandler(async (req, res) => {
  const data = labSchema.parse(req.body);
  const capacity = data.rows * data.cols;
  const count = data.pcCount ?? capacity;
  if (count > capacity) throw new AppError(`A ${data.rows} × ${data.cols} grid fits at most ${capacity} PCs.`, 400);
  const lab = await Lab.create({ code: data.code, name: data.name, location: data.location, rows: data.rows, cols: data.cols });
  const docs = [];
  for (let i = 0; i < count; i++) {
    docs.push({ lab: lab._id, number: i + 1, label: labLabel(i + 1), row: Math.floor(i / data.cols) + 1, col: (i % data.cols) + 1 });
  }
  if (docs.length) {
    const created = await Computer.insertMany(docs);
    await PcLog.insertMany(created.map((c) => ({
      computer: c._id, lab: lab._id, labCode: lab.code, pcLabel: c.label, kind: 'created', status: 'WORKING',
      text: 'PC added to the lab.', actorName: req.user.name,
    })));
  }
  emit('pc', { labId: String(lab._id) });
  res.status(201).json({ lab });
});

const update = asyncHandler(async (req, res) => {
  const data = labSchema.omit({ pcCount: true }).parse(req.body);
  const lab = await Lab.findById(req.params.id);
  if (!lab) throw new AppError('Lab not found.', 404);
  const outside = await Computer.countDocuments({ lab: lab._id, $or: [{ row: { $gt: data.rows } }, { col: { $gt: data.cols } }] });
  if (outside) throw new AppError(`${outside} PC(s) sit outside a ${data.rows} × ${data.cols} grid. Remove or keep the grid larger.`, 409);
  Object.assign(lab, data);
  await lab.save();
  emit('pc', { labId: String(lab._id) });
  res.json({ lab });
});

const remove = asyncHandler(async (req, res) => {
  const lab = await Lab.findById(req.params.id);
  if (!lab) throw new AppError('Lab not found.', 404);
  const open = await Complaint.countDocuments({ lab: lab._id, status: { $in: OPEN_STATUS } });
  if (open) throw new AppError(`This lab has ${open} open complaint(s). Resolve or reject them before deleting the lab.`, 409);
  await Computer.deleteMany({ lab: lab._id });
  await PcLog.deleteMany({ lab: lab._id });
  await lab.deleteOne();
  emit('pc', { labId: String(lab._id) });
  res.json({ message: 'Lab deleted.' });
});

// Add one PC to a free cell of the lab grid
const addComputer = asyncHandler(async (req, res) => {
  const body = z.object({ row: z.coerce.number().int().min(1).optional(), col: z.coerce.number().int().min(1).optional(),
    assetTag: z.string().trim().max(40).optional(), specs: z.string().trim().max(120).optional() }).parse(req.body);
  const lab = await Lab.findById(req.params.id);
  if (!lab) throw new AppError('Lab not found.', 404);
  const existing = await Computer.find({ lab: lab._id }).select('number row col').lean();
  const taken = new Set(existing.map((c) => `${c.row}:${c.col}`));

  let { row, col } = body;
  if (!row || !col) {
    outer: for (let r = 1; r <= lab.rows; r++) for (let c = 1; c <= lab.cols; c++) if (!taken.has(`${r}:${c}`)) { row = r; col = c; break outer; }
    if (!row) throw new AppError('The lab grid is full. Increase rows / columns first.', 409);
  }
  if (row > lab.rows || col > lab.cols) throw new AppError('That position is outside the lab grid.', 400);
  if (taken.has(`${row}:${col}`)) throw new AppError('A PC already exists at that position.', 409);

  const number = existing.reduce((m, c) => Math.max(m, c.number), 0) + 1;
  const computer = await Computer.create({ lab: lab._id, number, label: labLabel(number), row, col, assetTag: body.assetTag || '', specs: body.specs || '' });
  await PcLog.create({ computer: computer._id, lab: lab._id, labCode: lab.code, pcLabel: computer.label, kind: 'created', status: 'WORKING', text: 'PC added to the lab.', actorName: req.user.name });
  emit('pc', { labId: String(lab._id), computerId: String(computer._id), status: 'WORKING' });
  res.status(201).json({ computer });
});

module.exports = { list, get, create, update, remove, addComputer, labsWithCounts };
