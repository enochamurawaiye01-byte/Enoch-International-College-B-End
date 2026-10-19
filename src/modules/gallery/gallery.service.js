const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const { prisma } = require("../../config/database");
const repository = require("./gallery.repository");
const { isAdmin } = require("./gallery.utils");

const requireAdmin = (user, message = "Only administrators can manage the gallery.") => {
  if (!isAdmin(user?.role)) throw new AppError(message, 403, "GALLERY_ACCESS_DENIED");
};
const logChange = (user, action, id, description) => prisma.auditLog.create({
  data: { userId: user.userId || user.id, action, entity: "GalleryAlbum", entityId: id, description },
});
const toSlug = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180).replace(/-+$/g, "");

const getAlbum = async (id, user) => {
  const album = await repository.findAlbum(id);
  if (!album || (!isAdmin(user?.role) && album.status !== "PUBLISHED")) throw new NotFoundError("Gallery album not found");
  return album;
};

const createAlbum = async (data, user) => {
  requireAdmin(user, "Only administrators can create albums.");
  const slug = data.slug || toSlug(data.name);
  if (!slug) throw new AppError("Album name must contain letters or numbers.", 422, "INVALID_ALBUM_SLUG");
  if (await repository.findSlug(slug)) throw new AppError("Album slug already exists.", 409, "ALBUM_SLUG_EXISTS");
  const created = await repository.createAlbum({ ...data, slug, schoolId: user.schoolId || null, status: "DRAFT" });
  await logChange(user, "CREATE_GALLERY_ALBUM", created.id, `Created gallery album "${created.name}"`);
  return created;
};

const updateAlbum = async (id, data, user) => {
  requireAdmin(user, "Only administrators can update albums.");
  const existing = await getAlbum(id, user);
  if (data.slug && data.slug !== existing.slug && await repository.findSlug(data.slug)) {
    throw new AppError("Album slug already exists.", 409, "ALBUM_SLUG_EXISTS");
  }
  const updated = await repository.updateAlbum(id, data);
  await logChange(user, "UPDATE_GALLERY_ALBUM", id, `Updated gallery album "${existing.name}"`);
  return updated;
};

const publishAlbum = async (id, published, user) => {
  if (user?.role !== "SUPER_ADMIN") {
    throw new AppError("Only SUPER_ADMIN can publish or unpublish gallery albums.", 403, "GALLERY_PUBLISH_DENIED");
  }
  await getAlbum(id, user);
  const updated = await repository.updateAlbum(id, { status: published ? "PUBLISHED" : "DRAFT" });
  await logChange(user, published ? "PUBLISH_GALLERY_ALBUM" : "UNPUBLISH_GALLERY_ALBUM", id, `${published ? "Published" : "Unpublished"} gallery album "${updated.name}"`);
  return updated;
};

const removeAlbum = async (id, user) => {
  requireAdmin(user, "Only administrators can delete albums.");
  const existing = await getAlbum(id, user);
  const deleted = await repository.removeAlbum(id);
  await logChange(user, "DELETE_GALLERY_ALBUM", id, `Deleted gallery album "${existing.name}"`);
  return deleted;
};

const list = (user) => repository.findAlbums(isAdmin(user?.role) ? {} : { status: "PUBLISHED" });

const addImage = async (albumId, data, user) => {
  requireAdmin(user, "Only administrators can add gallery images.");
  const album = await getAlbum(albumId, user);
  if (!data.imageUrl) throw new AppError("Image URL or upload is required.", 422, "IMAGE_REQUIRED");
  const created = await repository.createImage({ ...data, albumId });
  await logChange(user, "ADD_GALLERY_IMAGE", albumId, `Added an image to gallery album "${album.name}"`);
  return created;
};

const updateImage = async (id, data, user) => {
  requireAdmin(user, "Only administrators can update gallery images.");
  const image = await repository.findImage(id);
  if (!image) throw new NotFoundError("Gallery image not found");
  const updated = await repository.updateImage(id, data);
  await logChange(user, "UPDATE_GALLERY_IMAGE", image.albumId, `Updated an image in gallery album "${image.album.name}"`);
  return updated;
};

const removeImage = async (id, user) => {
  requireAdmin(user, "Only administrators can delete gallery images.");
  const image = await repository.findImage(id);
  if (!image) throw new NotFoundError("Gallery image not found");
  const deleted = await repository.removeImage(id);
  await logChange(user, "DELETE_GALLERY_IMAGE", image.albumId, `Deleted an image from gallery album "${image.album.name}"`);
  return deleted;
};

module.exports = { createAlbum, updateAlbum, publishAlbum, removeAlbum, getAlbum, list, addImage, updateImage, removeImage };
