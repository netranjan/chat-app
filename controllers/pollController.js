const { getChanges } = require('../services/message.service');
const { getUserByUsername } = require('../services/auth.service');

exports.poll = async (req, res) => {
  const lastSync = req.query.lastSync;
  const changes = await getChanges(lastSync);

  let manuStatus = null;
  // Only show manu's online/typing to rasuv
  if (req.session.user.id === 1) {
    const manu = await getUserByUsername('manu');
    if (manu) {
      manuStatus = {
        isOnline: manu.isOnline,
        lastSeen: manu.lastSeen,
        isTyping: manu.isTyping,
        typingUpdatedAt: manu.typingUpdatedAt
      };
    }
  }

  res.json({
    success: true,
    newMessages: changes.newMessages,
    editedMessages: changes.editedMessages,
    manuStatus,          // rasuv will use this
    timestamp: new Date().toISOString()
  });
};