const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  q: { type: String, required: true },
  opts: [{ type: String, required: true }],
  ans: { type: Number, required: true },   // index of the correct option (0‑3)
  fact: { type: String, default: '' }
});

module.exports = mongoose.model('Question', questionSchema);