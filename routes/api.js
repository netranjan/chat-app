const router = require('express').Router();
const auth = require('../controllers/authController');
const msg = require('../controllers/messageController');
const status = require('../controllers/statusController');
const poll = require('../controllers/pollController');
const { isAuthenticated } = require('../middleware/auth');

// Auth
router.post('/login', auth.login);
router.get('/logout', auth.logout);

// Messages
router.get('/api/messages', isAuthenticated, msg.getMessages);
router.post('/messages', isAuthenticated, msg.sendMessage);
router.put('/messages/:id', isAuthenticated, msg.editMessage);
router.delete('/messages/:id', isAuthenticated, msg.deleteMessage);
router.post('/messages/:id/like', isAuthenticated, msg.likeMessage);
router.post('/messages/:id/read', isAuthenticated, msg.markRead);
router.delete('/messages/all', isAuthenticated, msg.deleteAll);
router.get('/messages/:id', isAuthenticated, msg.getMessage);

// Status
router.post('/status/typing', isAuthenticated, status.updateTyping);
router.post('/status/online', isAuthenticated, status.updateOnline);
router.post('/status/location', isAuthenticated, status.updateLocation);
router.get('/status/all', isAuthenticated, status.getAllStatuses);

// Polling
router.get('/sse/poll', isAuthenticated, poll.poll);

module.exports = router;