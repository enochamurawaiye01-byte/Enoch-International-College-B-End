const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const { prisma } = require("../../config/database");
const repository = require("./event.repository");
const { isAdmin, pagination } = require("./event.utils");

const logChange = (user, action, id, description) => prisma.auditLog.create({
  data: { userId: user.userId || user.id, action, entity: "Event", entityId: id, description },
});

const getById = async (id, user) => {
  const item = await repository.findById(id);
  if (!item || (!isAdmin(user?.role) && item.status !== "PUBLISHED")) throw new NotFoundError("Event not found");
  return item;
};

const create = async (data, user) => {
  if (!isAdmin(user.role)) throw new AppError("Only administrators can create events.", 403, "EVENT_ACCESS_DENIED");
  const created = await repository.create({ ...data, organizerId: user.userId, schoolId: user.schoolId || null, status: "DRAFT" });
  await logChange(user, "CREATE_EVENT", created.id, `Created event "${created.title}"`);
  return created;
};

const update = async (id, data, user) => {
  if (!isAdmin(user.role)) throw new AppError("Only administrators can update events.", 403, "EVENT_ACCESS_DENIED");
  const existing = await getById(id, user);
  const startDate = data.startDate || existing.startDate;
  const endDate = data.endDate || existing.endDate;
  if (startDate >= endDate) throw new AppError("startDate must be before endDate.", 422, "INVALID_EVENT_DATES");
  const updated = await repository.update(id, data);
  await logChange(user, "UPDATE_EVENT", id, `Updated event "${existing.title}"`);
  return updated;
};

const publish = async (id, published, user) => {
  if (!isAdmin(user.role)) throw new AppError("Only administrators can publish events.", 403, "EVENT_PUBLISH_DENIED");
  await getById(id, user);
  const updated = await repository.update(id, { status: published ? "PUBLISHED" : "DRAFT", publishedAt: published ? new Date() : null });
  await logChange(user, published ? "PUBLISH_EVENT" : "UNPUBLISH_EVENT", id, `${published ? "Published" : "Unpublished"} event "${updated.title}"`);
  return updated;
};

const remove = async (id, user) => {
  if (!isAdmin(user.role)) throw new AppError("Only administrators can delete events.", 403, "EVENT_DELETE_DENIED");
  const existing = await getById(id, user);
  const deleted = await repository.remove(id);
  await logChange(user, "DELETE_EVENT", id, `Deleted event "${existing.title}"`);
  return deleted;
};

const list = async (query, user) => {
  const normalized = {
    page: Number(query.page) > 0 ? Number(query.page) : 1,
    limit: Number(query.limit) > 0 ? Math.min(Number(query.limit), 100) : 20,
    period: query.period || "upcoming",
  };
  const now = new Date();
  const admin = isAdmin(user?.role);
  const where = admin ? {} : { status: "PUBLISHED" };
  if (admin && query.status) where.status = query.status;
  if (normalized.period === "upcoming") where.startDate = { gte: now };
  if (normalized.period === "past") where.endDate = { lt: now };
  if (query.search) where.OR = [
    { title: { contains: query.search, mode: "insensitive" } },
    { location: { contains: query.search, mode: "insensitive" } },
  ];
  const [data, total] = await Promise.all([
    repository.findMany(where, pagination(normalized)),
    repository.count(where),
  ]);
  return { data, pagination: { page: normalized.page, limit: normalized.limit, total, pages: Math.ceil(total / normalized.limit) } };
};

module.exports = { create, update, publish, remove, getById, list };
