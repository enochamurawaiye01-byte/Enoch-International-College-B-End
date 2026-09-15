const AuthError = require("../errors/AuthError");

const requireRoles = (...allowedRoles) => (req, res, next) => {
	if (!req.user || !allowedRoles.includes(req.user.role)) {
		return next(
			new AuthError(
				"You do not have permission to perform this action",
				403,
				"INSUFFICIENT_PERMISSIONS"
			)
		);
	}

	next();
};

module.exports = {
	requireRoles,
};
