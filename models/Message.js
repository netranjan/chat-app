const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  senderId: { type: Number, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date },
  deleted: { type: Boolean, default: false },
  replyTo: { type: Number }, // message id
  likes: [{ type: Number }],
  likesUpdatedAt: { type: Date },
  readBy: [{ type: Number }]
});

module.exports = mongoose.model('Message', messageSchema);