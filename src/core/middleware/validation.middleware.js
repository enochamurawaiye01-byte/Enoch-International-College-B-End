const ValidationError = require("../errors/ValidationError");

const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
                code: issue.code,
            }));

            return next(
                new ValidationError("Validation failed", errors)
            );
        }

        req.body = result.data;
        next();
    };
};

module.exports = validate;