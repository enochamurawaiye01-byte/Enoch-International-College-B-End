// Auth middleware
const AuthError = require("../errors/AuthError");
const authService = require("../../modules/auth/auth.service");
const moduleAccessService = require("../../modules/settings/module-access.service");
const { MODULE_KEYS } = require("../../modules/settings/module-access.constants");
const { hasPermission, moduleActionForRequest } = require("./authorization.middleware");
const { prisma } = require("../../config/database");

const getModuleFromRequest = (req) => {
    const segments = (req.originalUrl || req.baseUrl).split("?")[0].split("/").filter(Boolean);
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    const apiIndex = segments.indexOf("api");
    const moduleIndex = versionIndex >= 0 ? versionIndex + 1 : apiIndex >= 0 ? apiIndex + 1 : 0;
    const module = segments[moduleIndex];
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

        if (decoded.purpose && decoded.purpose !== "access") {
            throw new AuthError(
                "Invalid token purpose",
                401,
                "INVALID_TOKEN_PURPOSE"
            );
        }

        // Verify session exists in database and is not expired
        const session = await prisma.userSession.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!session || new Date(session.expiresAt) < new Date()) {
            throw new AuthError(
                "Session invalid or expired. Please sign in again.",
                401,
                "SESSION_EXPIRED"
            );
        }

        if (!session.user || session.user.status !== "ACTIVE") {
            throw new AuthError(
                "User account is not active",
                403,
                "ACCOUNT_NOT_ACTIVE"
            );
        }

        if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
            const module = getModuleFromRequest(req);
            if (module && session.user.schoolId) {
                await moduleAccessService.assertAccess({ schoolId: session.user.schoolId, module });
            }
        }

        req.user = {
            userId: session.user.id,
            id: session.user.id,
            role: session.user.role,
            schoolId: session.user.schoolId,
            fullName: session.user.fullName,
            email: session.user.email,
            status: session.user.status,
        };
        req.session = session;
        req.token = token;

        const permissionKey = moduleActionForRequest(req);
        if (permissionKey && !permissionKey.startsWith("notifications:")
            && !await hasPermission(req.user, permissionKey)) {
            if (permissionKey.startsWith("roles:")) {
                await prisma.auditLog.create({
                    data: {
                        userId: req.user.userId,
                        action: "UNAUTHORIZED_ROLE_MANAGEMENT_ATTEMPT",
                        entity: "Role",
                        description: "Blocked authenticated request to a role-management API"
                    }
                }).catch(() => {});
            }
            throw new AuthError("You do not have permission to access this module action.", 403, "INSUFFICIENT_PERMISSIONS");
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = authenticate;


