const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./inventory.repository");
const { INVENTORY_ERRORS: ERRORS } = require("./inventory.constants");
const createItem = async (data) => { if (await repository.findByCode(data.itemCode)) throw new AppError(ERRORS.ITEM_CODE_EXISTS, 409, "ITEM_CODE_EXISTS"); return repository.createItem(data); };
const getItems = async (query) => { const where = {}; if (query.category) where.category = query.category; const items = await repository.findItems(where); return query.lowStock === "true" ? items.filter((item) => item.quantity <= item.reorderLevel) : items; };
const createMovement = async (data, performedBy) => { const item = await repository.findItem(data.itemId); if (!item) throw new NotFoundError(ERRORS.ITEM_NOT_FOUND); const result = await repository.createMovement({ ...data, performedBy }); if (result?.insufficient) throw new AppError(ERRORS.INSUFFICIENT_STOCK, 409, "INSUFFICIENT_STOCK"); return repository.findItem(data.itemId); };
const getItem = async (id) => { const item = await repository.findItem(id); if (!item) throw new NotFoundError(ERRORS.ITEM_NOT_FOUND); return item; };
module.exports = { createItem, getItems, createMovement, getItem };
