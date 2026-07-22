const { getChanges } = require('../services/message.service');
const { getUserByUsername } = require('../services/auth.service');

exports.poll = async (req, res) => {
  try {
    const lastSync = req.query.lastSync;
    const changes = await getChanges(lastSync);

    // Determine the new timestamp – use the latest message timestamp if any, else keep the old one
    let newTimestamp = lastSync;
    const allMessages = [...changes.newMessages, ...changes.editedMessages];
    if (allMessages.length > 0) {
      const timestamps = allMessages.map(m => new Date(m.timestamp).getTime());
      const maxTimestamp = new Date(Math.max(...timestamps)).toISOString();
      // Also consider editedAt and likesUpdatedAt for edited messages
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
      try {
        const manu = await getUserByUsername('manu');
        if (manu) {
          manuStatus = {
            isOnline: manu.isOnline,
            lastSeen: manu.lastSeen,
            isTyping: manu.isTyping,
            typingUpdatedAt: manu.typingUpdatedAt
          };
        }
      } catch (err) {
        console.error('Error fetching manu status:', err);
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