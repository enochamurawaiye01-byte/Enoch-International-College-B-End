const NotFoundError = require("../../core/errors/NotFoundError");
const AppError = require("../../core/errors/AppError");
const repository = require("./result.repository");
const { prisma } = require("../../config/database");

const calculateGrade = (percentage) => {
	const pct = Number(percentage);
	if (pct >= 70) return "A";
	if (pct >= 60) return "B";
	if (pct >= 50) return "C";
	if (pct >= 45) return "D";
	return "F";
};

const getById = async (id) => {
	const result = await repository.findById(id);
	if (!result) throw new NotFoundError("Result not found");
	return result;
};

const getStudentResults = (studentId, canSeeUnpublished) =>
	repository.findForStudent(studentId, !canSeeUnpublished);

const getMyResults = async (userId) => {
	const student = await repository.findStudentByUserId(userId);
	return student ? repository.findForStudent(student.id, true) : [];
};

const getAll = (query) => {
	const where = {};
	["studentId", "examId", "sessionId", "termId", "published"].forEach((key) => {
		if (query[key] !== undefined) {
			where[key] = key === "published" ? query[key] === "true" : query[key];
		}
	});
	return repository.findAll(where);
};

const getForTeacher = (userId, query) => {
	const where = {};
	["examId", "sessionId", "termId"].forEach((key) => {
		if (query[key]) where[key] = query[key];
	});
	return repository.findForTeacher(userId, where);
};

const setPublished = async (id, published, actor) => {
	const existing = await getById(id);
	if (actor && !["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
		throw new AppError("Only administrators can publish/unpublish exam results.", 403, "RESULT_PUBLISH_DENIED");
	}

	const updated = await repository.update(id, { published });

	if (actor) {
		await prisma.auditLog.create({
			data: {
				userId: actor.userId || actor.id,
				action: published ? "PUBLISH_RESULT" : "UNPUBLISH_RESULT",
				entity: "Result",
				entityId: id,
				description: `${published ? "Published" : "Unpublished"} result for exam ${existing.examId}`,
			},
		});
	}

	return updated;
};

const updateResult = async (id, data, actor, reason) => {
	const existing = await getById(id);

	if (existing.published && !["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
		throw new AppError("Published results are locked and can only be edited by administrators.", 403, "RESULT_LOCKED");
	}

	if (existing.published && !reason) {
		throw new AppError("An administrative reason is required to edit a locked/published result.", 400, "REASON_REQUIRED");
	}

	const score = data.score !== undefined ? Number(data.score) : Number(existing.score);
	const totalMarks = data.totalMarks !== undefined ? Number(data.totalMarks) : Number(existing.totalMarks);
	const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
	const grade = calculateGrade(percentage);

	const updated = await repository.update(id, {
		score,
		totalMarks,
		percentage,
		grade,
		status: score >= Number(existing.exam.passMark) ? "PASS" : "FAIL",
	});

	await prisma.auditLog.create({
		data: {
			userId: actor.userId || actor.id,
			action: "UPDATE_RESULT",
			entity: "Result",
			entityId: id,
			description: `Updated result for student ${existing.studentId}. Reason: ${reason || "Correction before publishing"}`,
		},
	});

	return updated;
};

const publishExamResults = async (examId, actor) => {
	if (actor && !["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
		throw new AppError("Only administrators can publish exam results.", 403, "RESULT_PUBLISH_DENIED");
	}

	const examResults = await prisma.result.findMany({
		where: { examId },
		orderBy: { percentage: "desc" },
	});

	if (!examResults.length) {
		throw new NotFoundError("No results found for this exam");
	}

	// Calculate class positions
	let currentPosition = 1;
	for (let i = 0; i < examResults.length; i++) {
		if (i > 0 && Number(examResults[i].percentage) < Number(examResults[i - 1].percentage)) {
			currentPosition = i + 1;
		}

		await prisma.result.update({
			where: { id: examResults[i].id },
			data: {
				position: currentPosition,
				published: true,
				grade: calculateGrade(examResults[i].percentage),
			},
		});
	}

	await prisma.auditLog.create({
		data: {
			userId: actor.userId || actor.id,
			action: "PUBLISH_EXAM_RESULTS",
			entity: "Exam",
			entityId: examId,
			description: `Published all ${examResults.length} results for exam ${examId}`,
		},
	});

	return { success: true, count: examResults.length, message: "Exam results published successfully." };
};

module.exports = {
	calculateGrade,
	getById,
	getStudentResults,
	getMyResults,
	getAll,
	getForTeacher,
	setPublished,
	updateResult,
	publishExamResults,
};

