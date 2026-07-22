const router = require('express').Router();
const auth = require('../controllers/authController');
const pages = require('../controllers/pagesController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', pages.home);
router.get('/login', pages.loginPage);
router.get('/chat', isAuthenticated, pages.chat);
router.get('/logout', auth.logout);   // <-- this must be here

module.exports = router;