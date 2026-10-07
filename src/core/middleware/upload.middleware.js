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
const imageMimeByExtension = new Map([[".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"], [".webp", "image/webp"]]);

const detectImageMime = (buffer) => {
	if (!Buffer.isBuffer(buffer)) return null;
	if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
	if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
	if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
	return null;
};

const validateImageContent = (req, _res, next) => {
	const file = req.file;
	if (!file) return next(new AppError("A profile image is required.", 422, "PROFILE_IMAGE_REQUIRED"));
	const extension = path.extname(file.originalname).toLowerCase();
	const detectedMime = detectImageMime(file.buffer);
	if (!detectedMime || imageMimeByExtension.get(extension) !== detectedMime || file.mimetype !== detectedMime) {
		return next(new AppError("Upload must be a valid JPG, PNG, or WEBP image.", 415, "INVALID_PROFILE_IMAGE"));
	}
	return next();
};

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE_BYTES) || 5 * 1024 * 1024, files: 1 },
	fileFilter: (_req, file, callback) => {
		const extension = path.extname(file.originalname).toLowerCase();
		if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) return callback(new AppError("Unsupported upload type.", 415, "UNSUPPORTED_FILE_TYPE"));
		callback(null, true);
	},
});

module.exports = { upload, allowedMimeTypes, allowedExtensions, detectImageMime, validateImageContent };
