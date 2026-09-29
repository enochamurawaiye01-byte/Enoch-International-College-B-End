const audit = async (prisma, actorId, action, entity, entityId, description) => {
  try {
    if (!prisma || !prisma.auditLog) return null;
    return await prisma.auditLog.create({ data: { userId: actorId, action, entity, entityId, description } });
  } catch (err) {
    // Audit logging failure should not crash business operations
    return null;
  }
};
module.exports = { audit };

