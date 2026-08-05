const express = require('express');
const router = require('express').Router();
const msg = require('../controllers/messageController');
const poll = require('../controllers/pollController');
const auth = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

// Auth
router.post('/login', auth.login);

// Status routes (handles /status/typing, /status/online, /status/location, /status/all, /status/dashboard)
const statusRoutes = require('./status');
router.use('/status', statusRoutes);

// Messages
router.get('/api/messages', isAuthenticated, msg.getMessages);
router.post('/messages', isAuthenticated, msg.sendMessage);
router.put('/messages/:id', isAuthenticated, msg.editMessage);
router.delete('/messages/all', isAuthenticated, msg.deleteAll);
router.delete('/messages/:id', isAuthenticated, msg.deleteMessage);
router.post('/messages/:id/like', isAuthenticated, msg.likeMessage);
router.post('/messages/:id/read', isAuthenticated, msg.markRead);
router.get('/messages/:id', isAuthenticated, msg.getMessage);

// Polling
router.get('/sse/poll', isAuthenticated, poll.poll);

// Questions
const questionsController = require('../controllers/questionsController');
router.get('/api/questions/random', questionsController.getRandomQuestions);

// Content
const contentController = require('../controllers/contentController');
router.get('/api/content', contentController.getContentByType);

module.exports = router;