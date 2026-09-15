const { prisma } = require("../../config/database");
const include = { movements: { orderBy: { createdAt: "desc" } } };
const findItem = (id) => prisma.inventoryItem.findUnique({ where: { id }, include });
const findItems = (where) => prisma.inventoryItem.findMany({ where, include, orderBy: { name: "asc" } });
const findByCode = (itemCode) => prisma.inventoryItem.findUnique({ where: { itemCode } });
const createItem = (data) => prisma.inventoryItem.create({ data, include });
const createMovement = (data) => prisma.$transaction(async (tx) => { const item = await tx.inventoryItem.findUnique({ where: { id: data.itemId } }); if (!item) return null; const delta = ["STOCK_IN", "ADJUSTMENT"].includes(data.type) ? data.quantity : -data.quantity; const quantity = item.quantity + delta; if (quantity < 0) return { insufficient: true }; const movement = await tx.inventoryMovement.create({ data }); await tx.inventoryItem.update({ where: { id: data.itemId }, data: { quantity } }); return { movement, quantity }; });
module.exports = { findItem, findItems, findByCode, createItem, createMovement };
