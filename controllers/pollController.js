// controllers/pollController.js
const { getChanges } = require('../services/message.service');
const { getStatus } = require('../services/userStatusStore');

exports.poll = async (req, res) => {
  try {
    const lastSync = req.query.lastSync;
    const changes = await getChanges(lastSync);

    let newTimestamp = lastSync;
    const allMessages = [...changes.newMessages, ...changes.editedMessages];
    if (allMessages.length > 0) {
      const timestamps = allMessages.map(m => new Date(m.timestamp).getTime());
      const maxTimestamp = new Date(Math.max(...timestamps)).toISOString();
      const editTimestamps = changes.editedMessages
        .flatMap(m => [new Date(m.editedAt).getTime(), new Date(m.likesUpdatedAt).getTime()])
        .filter(t => !isNaN(t));
      if (editTimestamps.length > 0) {
        const maxEdit = new Date(Math.max(...editTimestamps)).toISOString();
        newTimestamp = new Date(Math.max(new Date(maxTimestamp).getTime(), new Date(maxEdit).getTime())).toISOString();
      } else {
        newTimestamp = maxTimestamp;
      }
    }

    let manuStatus = null;
    if (req.session.user?.id === 1) {
      const status = await getStatus(2);
      if (status) {
        manuStatus = {
          isOnline: status.isOnline,
          lastSeen: status.lastSeen,
          isTyping: status.isTyping,
          typingUpdatedAt: status.typingUpdatedAt
        };
      }
    }

    res.json({
      success: true,
      newMessages: changes.newMessages,
      editedMessages: changes.editedMessages,
      manuStatus,
      timestamp: newTimestamp || new Date().toISOString()
    });
  } catch (err) {
    console.error('Poll error:', err);
    res.status(500).json({
      success: false,
      message: 'Polling temporarily failed',
      timestamp: new Date().toISOString()
    });
  }
};