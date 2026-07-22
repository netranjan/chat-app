const messageService = require('../services/message.service');
const Message = require('../models/Message');

exports.getMessages = async (req, res) => {
  try {
    const messages = await messageService.getAllMessages();
    res.json(messages);
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { text, replyTo } = req.body;
    const senderId = req.session.user?.id;
    if (!senderId) return res.status(401).json({ success: false, message: 'Not logged in' });

    const msg = await messageService.sendMessage(senderId, text, replyTo || null);
    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ success: false, message: err.message || 'Could not send message' });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const msg = await messageService.editMessage(Number(req.params.id), req.session.user.id, req.body.text);
    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('editMessage error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    // soft delete – sets deleted:true
    const msg = await messageService.deleteMessage(Number(req.params.id), req.session.user.id);
    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('deleteMessage error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.likeMessage = async (req, res) => {
  try {
    const msg = await messageService.toggleLike(Number(req.params.id), req.session.user.id);
    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('likeMessage error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    await messageService.markAsRead(Number(req.params.id), req.session.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('markRead error:', err);
    res.status(500).json({ success: false });
  }
};

exports.deleteAll = async (req, res) => {
  try {
    // Only admin (rasuv) can clear the chat
    if (req.session.user.id !== 1) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    // Soft delete all messages – hide them instead of removing permanently
    await Message.updateMany(
      { deleted: false },          // only affect visible messages
      { $set: { deleted: true, edited: true, editedAt: new Date() } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('deleteAll error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear chat' });
  }
};

exports.getMessage = async (req, res) => {
  try {
    const msg = await Message.findOne({ id: Number(req.params.id) });
    res.json(msg);
  } catch (err) {
    console.error('getMessage error:', err);
    res.status(500).json(null);
  }
};