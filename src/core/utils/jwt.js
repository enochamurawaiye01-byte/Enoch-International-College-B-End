// JWT utilities
const jwt = require('jsonwebtoken');

const generateAccessToken = (payload) => {
  const expiresIn = payload.role === 'SUPER_ADMIN'
    ? '15m'
    : (process.env.JWT_EXPIRES_IN || '1d');
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};