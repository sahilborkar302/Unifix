const mongoose = require('mongoose');
const { PC_STATUS } = require('../utils/helpers');

const computerSchema = new mongoose.Schema(
  {
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true, index: true },
    number: { type: Number, required: true },
    label: { type: String, required: true }, // PC-01
    row: { type: Number, required: true, min: 1 }, // position in the lab grid (1 = front row)
    col: { type: Number, required: true, min: 1 },
    status: { type: String, enum: PC_STATUS, default: 'WORKING', index: true },
    assetTag: { type: String, trim: true, maxlength: 40, default: '' },
    specs: { type: String, trim: true, maxlength: 120, default: '' },
    statusUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

computerSchema.index({ lab: 1, number: 1 }, { unique: true });
computerSchema.index({ lab: 1, row: 1, col: 1 }, { unique: true });

module.exports = mongoose.model('Computer', computerSchema);
