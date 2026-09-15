// Auth error
const AppError = require('./AppError');

class AuthError extends AppError {
  constructor(
    message = 'Authentication failed',
    statusCode = 401,
    code = 'AUTHENTICATION_ERROR'
  ) {
    super(message, statusCode, code);
    this.name = 'AuthError';
  }
}

module.exports = AuthError;