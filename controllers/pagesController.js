exports.home = (req, res) => {
  res.render('home', { user: req.session.user || null });
};
exports.loginPage = (req, res) => {
  if (req.session.user) return res.redirect('/chat');
  res.render('login');
};
exports.chat = (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.render('chat', { user: req.session.user });
};