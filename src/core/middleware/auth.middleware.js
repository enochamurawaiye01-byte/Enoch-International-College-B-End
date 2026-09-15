// Auth middleware
const AuthError = require("../errors/AuthError");
const authService = require("../../modules/auth/auth.service");
const moduleAccessService = require("../../modules/settings/module-access.service");
const { MODULE_KEYS } = require("../../modules/settings/module-access.constants");

const getModuleFromRequest = (req) => {
    const segments = req.baseUrl.split("/").filter(Boolean);
    const module = segments[segments.indexOf("api") + 1];
    return MODULE_KEYS.includes(module) ? module : null;
};

const authenticate = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization;

        if (!authorization) {
            throw new AuthError(
                "Authentication token is required",
                401,
                "TOKEN_REQUIRED"
            );
        }

        const [type, token] = authorization.split(" ");

        if (type !== "Bearer" || !token) {
            throw new AuthError(
                "Invalid authorization format",
                401,
                "INVALID_TOKEN"
            );
        }

        const decoded = authService.verifyToken(token);

        if (!['SUPER_ADMIN', 'ADMIN'].includes(decoded.role)) {
            const module = getModuleFromRequest(req);
            if (module && decoded.schoolId) {
                await moduleAccessService.assertAccess({ schoolId: decoded.schoolId, module });
            }
        }

        req.user = decoded;
        req.token = token;

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = authenticate;

