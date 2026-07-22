const { validateUser } = require('../services/auth.service');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await validateUser(username, password);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  req.session.user = { id: user.id, username: user.username };
  res.json({ success: true });
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/chat');
    }
    res.clearCookie('connect.sid'); // default session cookie name
    res.redirect('/');
  });
};