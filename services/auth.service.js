const User = require('../models/User');
const { USERS } = require('../config/constants');

async function validateUser(username, password) {
  const user = await User.findOne({ username });
  if (!user) return null;
  if (user.password !== password) return null; // plain text, as per spec
  return user;
}

function getUserByUsername(username) {
  return User.findOne({ username });
}

function getUserById(id) {
  return User.findOne({ id });
}

module.exports = { validateUser, getUserByUsername, getUserById };