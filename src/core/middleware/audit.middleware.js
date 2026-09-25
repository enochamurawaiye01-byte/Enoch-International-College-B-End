const { prisma } = require("../../config/database");

const auditLog = (actionName, entityName) => async (req, res, next) => {
    const originalJson = res.json;

    res.json = function (body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const userId = req.user?.userId || req.user?.id || null;
            const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
            const userAgent = req.headers["user-agent"] || null;

            let entityId = req.params?.id || req.body?.id || null;
            if (!entityId && body && body.data) {
                entityId = body.data.id || body.data.userId || null;
            }

            prisma.auditLog.create({
                data: {
                    userId,
                    action: actionName || `${req.method}_${req.baseUrl.split("/").pop().toUpperCase()}`,
                    entity: entityName || req.baseUrl.split("/").pop(),
                    entityId: entityId ? String(entityId) : null,
                    description: `${actionName || req.method} performed by user ${userId || "anonymous"}`,
                    ipAddress: ipAddress ? String(ipAddress) : null,
                    userAgent: userAgent ? String(userAgent) : null,
                },
            }).catch((err) => {
                console.error("Audit log error:", err.message);
            });
        }
        return originalJson.call(this, body);
    };

    next();
};

module.exports = { auditLog };
