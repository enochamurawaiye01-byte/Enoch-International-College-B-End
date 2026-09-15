const multer = require("multer");
const path = require("path");
const AppError = require("../errors/AppError");

const allowedMimeTypes = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"application/pdf",
]);
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE_BYTES) || 5 * 1024 * 1024, files: 1 },
	fileFilter: (_req, file, callback) => {
		const extension = path.extname(file.originalname).toLowerCase();
		if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) return callback(new AppError("Unsupported upload type.", 415, "UNSUPPORTED_FILE_TYPE"));
		callback(null, true);
	},
});

module.exports = { upload, allowedMimeTypes, allowedExtensions };
