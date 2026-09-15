const buildWhere = (query) => ({ ...(query.action ? { action: query.action } : {}), ...(query.entity ? { entity: query.entity } : {}), ...(query.userId ? { userId: query.userId } : {}), ...((query.from || query.to) ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}) });
module.exports = { buildWhere };
