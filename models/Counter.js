// models/Counter.js - Tracks sequential IDs for PMC Grievances (PMC-YYYY-XXXX)
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

/**
 * Static method to fetch the next sequential number atomically
 * Example counterId: 'pmc_grievance_2026'
 */
counterSchema.statics.getNextSequence = async function (counterId) {
  const result = await this.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
