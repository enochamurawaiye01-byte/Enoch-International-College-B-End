// JWT utilities
const jwt = require('jsonwebtoken');

const generateAccessToken = (payload) => {
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '2h';
  return jwt.sign({ ...payload, purpose: 'access' }, process.env.JWT_SECRET, {
    expiresIn,
  });
};

const generateRefreshToken = (payload) => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign({ ...payload, purpose: 'refresh' }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn,
  });
};

const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose && decoded.purpose !== 'access') {
    throw new Error('Invalid token purpose');
  }
  return decoded;
};

const verifyRefreshToken = (token) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  const decoded = jwt.verify(token, secret);
  if (decoded.purpose !== 'refresh') {
    throw new Error('Invalid token purpose');
  }
  return decoded;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};