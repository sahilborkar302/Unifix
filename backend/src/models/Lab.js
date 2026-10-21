const mongoose = require('mongoose');

const labSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    location: { type: String, trim: true, maxlength: 80, default: '' },
    rows: { type: Number, required: true, min: 1, max: 20 },
    cols: { type: Number, required: true, min: 1, max: 20 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lab', labSchema);
