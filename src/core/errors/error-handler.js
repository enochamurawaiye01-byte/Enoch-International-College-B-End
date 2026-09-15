const errorHandler = (error, req, res, next) => {
    if (process.env.NODE_ENV !== "test") console.error(error);

    const statusCode = error.statusCode || 500;
    const response = {
        success: false,
        error: {
            code: error.code || "INTERNAL_ERROR",
            message: error.message || "Something went wrong.",
        },
    };

    if (error.errors) response.error.details = error.errors;
    if (process.env.NODE_ENV !== "production" && error.stack) response.error.stack = error.stack;

    return res.status(statusCode).json(response);
};

module.exports = errorHandler;