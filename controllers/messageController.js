const messageService = require('../services/message.service');

exports.getMessages = async (req, res) => {
  const messages = await messageService.getAllMessages();
  res.json(messages);
};

exports.sendMessage = async (req, res) => {
  const { text, replyTo } = req.body;
  const senderId = req.session.user.id;
  const msg = await messageService.sendMessage(senderId, text, replyTo);
  res.json({ success: true, message: msg });
};

exports.editMessage = async (req, res) => {
  try {
    const msg = await messageService.editMessage(Number(req.params.id), req.session.user.id, req.body.text);
    res.json({ success: true, message: msg });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const msg = await messageService.deleteMessage(Number(req.params.id), req.session.user.id);
    res.json({ success: true, message: msg });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.likeMessage = async (req, res) => {
  try {
    const msg = await messageService.toggleLike(Number(req.params.id), req.session.user.id);
    res.json({ success: true, message: msg });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.markRead = async (req, res) => {
  await messageService.markAsRead(Number(req.params.id), req.session.user.id);
  res.json({ success: true });
};

exports.deleteAll = async (req, res) => {
  if (req.session.user.id !== 1) return res.status(403).json({ success: false, message: 'Admin only' });
  await messageService.deleteAllMessages();
  res.json({ success: true });
};

exports.getMessage = async (req, res) => {
  const msg = await require('../models/Message').findOne({ id: Number(req.params.id) });
  res.json(msg);
};