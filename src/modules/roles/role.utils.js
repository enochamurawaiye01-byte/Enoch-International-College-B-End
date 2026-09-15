const audit = async (prisma, actorId, action, entity, entityId, description) => prisma.auditLog.create({ data: { userId: actorId, action, entity, entityId, description } });
module.exports = { audit };
