class ValidationError extends Error {
    constructor(message, errors = []) {
        super(message);

        this.name = "ValidationError";
        this.code = "VALIDATION_ERROR";
        this.statusCode = 400;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ValidationError;