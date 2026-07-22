function guestOnly(req, res, next) {
  if (!req.session.user) return next();
  res.redirect('/chat');
}
module.exports = { guestOnly };