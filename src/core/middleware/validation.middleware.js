const ValidationError = require("../errors/ValidationError");

const formatFieldName = (field) => {
    if (!field || field === "root") return "";
    return field
        .replace(/([A-Z])/g, " $1")
        .replace(/[._]/g, " ")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
};

const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.issues.map((issue) => {
                const field = issue.path.join(".");
                return {
                    field: field || "root",
                    message: issue.message,
                    code: issue.code,
                };
            });

            const primaryMsg = errors
                .map((e) => {
                    const fieldName = formatFieldName(e.field);
                    return fieldName ? `${fieldName}: ${e.message}` : e.message;
                })
                .join(" | ");

            return next(
                new ValidationError(primaryMsg || "Validation failed. Please check your inputs.", errors)
            );
        }

        req.body = result.data;
        next();
    };
};

module.exports = validate;