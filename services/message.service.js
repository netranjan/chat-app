const Message = require('../models/Message');
const { getNextMessageId } = require('./database.service');

async function getAllMessages() {
    // exclude soft-deleted unless needed? We'll return all but client filters deleted out.
    return Message.find().sort({ timestamp: 1 });
}

async function sendMessage(senderId, text, replyTo = null) {
    const id = await getNextMessageId();
    const msg = await Message.create({
        id,
        senderId,
        text,
        timestamp: new Date(),
        replyTo
    });
    return msg;
}

async function editMessage(messageId, userId, newText) {
    const msg = await Message.findOne({ id: messageId });
    if (!msg || msg.deleted || msg.senderId !== userId) throw new Error('Not allowed');
    msg.text = newText;
    msg.edited = true;
    msg.editedAt = new Date();
    await msg.save();
    return msg;
}

async function deleteMessage(messageId, userId) {
    const msg = await Message.findOne({ id: messageId });
    if (!msg || msg.deleted || msg.senderId !== userId) throw new Error('Not allowed');
    msg.deleted = true;
    msg.edited = true; // mark as edited for polling
    msg.editedAt = new Date();
    await msg.save();
    return msg;
}

async function toggleLike(messageId, userId) {
    const msg = await Message.findOne({ id: messageId });
    if (!msg || msg.deleted) throw new Error('Message not found');
    const idx = msg.likes.indexOf(userId);
    if (idx === -1) {
        msg.likes.push(userId);
    } else {
        msg.likes.splice(idx, 1);
    }
    msg.likesUpdatedAt = new Date();
    await msg.save();
    return msg;
}

async function markAsRead(messageId, userId) {
    const msg = await Message.findOne({ id: messageId });
    if (!msg || msg.deleted) return;
    if (!msg.readBy.includes(userId)) {
        msg.readBy.push(userId);
        await msg.save();
    }
}

async function deleteAllMessages(adminId) {
    // only admin can do this
    await Message.deleteMany({});
}

async function getChanges(lastSync) {
  const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

  // New messages (not deleted)
  const newMessages = await Message.find({
    timestamp: { $gt: lastSyncDate },
    deleted: false
  });

  // Edited or liked messages – include deleted ones so clients can hide them
  const editedMessages = await Message.find({
    $or: [
      { editedAt: { $gt: lastSyncDate } },
      { likesUpdatedAt: { $gt: lastSyncDate } }
    ]
    // note: no "deleted: false" filter – client will handle deleted messages
  });

  return { newMessages, editedMessages };
}

module.exports = {
    getAllMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleLike,
    markAsRead,
    deleteAllMessages,
    getChanges
};