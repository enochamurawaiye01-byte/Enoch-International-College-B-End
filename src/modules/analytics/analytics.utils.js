const dateFilter = (query, field = "createdAt") => query.from || query.to ? { [field]: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {};
module.exports = { dateFilter };
