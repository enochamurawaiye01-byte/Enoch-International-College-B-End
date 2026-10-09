const multer = require("multer");
const path = require("path");
const AppError = require("../errors/AppError");

const MAX_APPLICATION_LETTER_BYTES = 115 * 1024;
const allowedTypes = new Map([
	[".pdf", "application/pdf"],
	[".doc", "application/msword"],
	[".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
]);

const parseApplicationLetter = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_APPLICATION_LETTER_BYTES, files: 1 },
	fileFilter: (_req, file, callback) => {
		const extension = path.extname(file.originalname).toLowerCase();
		if (allowedTypes.get(extension) !== file.mimetype) {
			return callback(new AppError("Application letter must be a PDF, DOC, or DOCX document.", 415, "INVALID_APPLICATION_LETTER_TYPE"));
		}
		return callback(null, true);
	},
}).single("applicationLetter");

const uploadApplicationLetter = (req, res, next) => {
	parseApplicationLetter(req, res, (error) => {
		if (error?.code === "LIMIT_FILE_SIZE") {
			return next(new AppError("Application letter must not exceed 115 KB.", 413, "APPLICATION_LETTER_TOO_LARGE"));
		}
		if (error) return next(error);
		return next();
	});
};

const validateApplicationLetter = (req, _res, next) => {
	const isTeacher = String(req.body.role || "").toUpperCase() === "TEACHER";
	if (isTeacher && !req.file) {
		return next(new AppError("An application letter is required for teacher registration.", 422, "TEACHER_APPLICATION_LETTER_REQUIRED"));
	}
	if (!isTeacher && req.file) {
		return next(new AppError("An application letter can only be submitted with a teacher application.", 422, "APPLICATION_LETTER_ROLE_INVALID"));
	}
	if (!req.file) return next();

	const extension = path.extname(req.file.originalname).toLowerCase();
	const buffer = req.file.buffer;
	const isPdf = extension === ".pdf" && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
	const isDoc = extension === ".doc"
		&& buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
	const isDocx = extension === ".docx"
		&& buffer.length >= 4
		&& buffer[0] === 0x50
		&& buffer[1] === 0x4b
		&& [0x03, 0x05, 0x07].includes(buffer[2])
		&& [0x04, 0x06, 0x08].includes(buffer[3]);
	if (!isPdf && !isDoc && !isDocx) {
		return next(new AppError("The application letter content does not match a valid PDF, DOC, or DOCX document.", 415, "INVALID_APPLICATION_LETTER_CONTENT"));
	}
	return next();
};

module.exports = { MAX_APPLICATION_LETTER_BYTES, uploadApplicationLetter, validateApplicationLetter };
