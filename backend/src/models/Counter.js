const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.model('Counter', counterSchema);

// REPORT-2026-000123
Counter.nextReportId = async function () {
  const year = new Date().getFullYear();
  const doc = await Counter.findOneAndUpdate(
    { _id: `report-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `REPORT-${year}-${String(doc.seq).padStart(6, '0')}`;
};

module.exports = Counter;
