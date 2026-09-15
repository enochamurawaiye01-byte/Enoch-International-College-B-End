const AUTH_CONSTANTS = {
  // ==========================================
  // PASSWORD RULES
  // ==========================================

  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,

    // Password must contain:
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL_CHARACTER: true,

    // Characters that are allowed as special characters
    SPECIAL_CHARACTERS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  },

  // ==========================================
  // SESSION RULES
  // ==========================================

  SESSION: {
    DEFAULT_DAYS: 7,
    MAX_DAYS: 30,

    // Maximum number of active sessions
    MAX_ACTIVE_SESSIONS: 5,
  },

  // ==========================================
  // LOGIN SECURITY
  // ==========================================

  LOGIN: {
    MAX_FAILED_ATTEMPTS: 5,

    // Account can be temporarily locked after
    // too many failed login attempts
    LOCKOUT_MINUTES: 15,

    // Delay between login attempts
    MIN_ATTEMPT_INTERVAL_MS: 1000,
  },

  // ==========================================
  // EMAIL RULES
  // ==========================================

  EMAIL: {
    MAX_LENGTH: 254,

    // Basic email validation pattern
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  // ==========================================
  // USERNAME / NAME RULES
  // ==========================================

  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },

  // ==========================================
  // TOKEN RULES
  // ==========================================

  TOKEN: {
    TYPE: 'Bearer',

    ACCESS_TOKEN_EXPIRES_IN: '1d',
    REFRESH_TOKEN_EXPIRES_IN: '30d',
  },

  // ==========================================
  // AUTHENTICATION ERROR CODES
  // ==========================================

  ERROR_CODES: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

    EMAIL_REQUIRED: 'EMAIL_REQUIRED',

    INVALID_EMAIL: 'INVALID_EMAIL',

    PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',

    PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',

    PASSWORD_TOO_LONG: 'PASSWORD_TOO_LONG',

    WEAK_PASSWORD: 'WEAK_PASSWORD',

    USER_NOT_FOUND: 'USER_NOT_FOUND',

    ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',

    ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',

    ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',

    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

    SESSION_EXPIRED: 'SESSION_EXPIRED',

    INVALID_TOKEN: 'INVALID_TOKEN',

    TOKEN_REQUIRED: 'TOKEN_REQUIRED',

    TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',

    EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',

    REGISTRATION_FAILED: 'REGISTRATION_FAILED',

    LOGOUT_FAILED: 'LOGOUT_FAILED',
  },

  // ==========================================
  // USER STATUS
  // ==========================================

  ALLOWED_LOGIN_STATUSES: [
    'ACTIVE',
  ],

  BLOCKED_LOGIN_STATUSES: [
    'INACTIVE',
    'SUSPENDED',
    'DEACTIVATED',
  ],
};

module.exports = AUTH_CONSTANTS;