const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./report-card.repository");
const { calculateAssessment, canEnterTermAssessment, DEFAULT_ASSESSMENT_CONFIGURATION, gradeFor, sum } = require("./report-card.utils");
const { prisma } = require("../../config/database");
const { hasPermission } = require("../../core/middleware/authorization.middleware");
const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MANAGEMENT", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER"]);
const isAdmin = (role) => ADMIN_ROLES.has(role);
const canManageResults = async (user) => Boolean(user) && user.role !== "TEACHER" && (
	isAdmin(user.role)
	|| await hasPermission(user, "results:edit")
	|| await hasPermission(user, "report_cards:edit")
);
const getConfiguration = async (user) => {
	const schoolId = user.schoolId || null;
	const scopeKey = schoolId ? `school:${schoolId}` : "default";
	const stored = await repository.findConfiguration(scopeKey);
	return stored || { ...DEFAULT_ASSESSMENT_CONFIGURATION, scopeKey, schoolId };
};

const updateConfiguration = async (data, user) => {
	if (!(await canManageResults(user))) throw new AppError("Only administrators with result-management permission can update assessment settings.", 403, "ASSESSMENT_SETTINGS_DENIED");
	const gradeBands = [...data.gradeBands].sort((left, right) => right.minimum - left.minimum);
	if (gradeBands.at(-1)?.minimum !== 0) throw new AppError("Grade bands must include a zero-percent floor.", 422, "GRADE_BANDS_INVALID");
	const schoolId = user.schoolId || null;
	const scopeKey = schoolId ? `school:${schoolId}` : "default";
	return repository.saveConfiguration(scopeKey, schoolId, user.userId, {
		firstTestMax: data.firstTestMax,
		secondTestMax: data.secondTestMax,
		examMax: data.examMax,
		gradeBands
	});
};

const assertTeacherAssignment = async (user, { classId, subjectId, sessionId, termId }) => {
	if (await canManageResults(user)) return null;
	if (user.role !== "TEACHER") throw new AppError("You cannot manage these results.", 403, "REPORT_CARD_ACCESS_DENIED");
	const staff = await repository.findStaffByUserId(user.userId);
	if (!staff || staff.status !== "ACTIVE") throw new AppError("An active staff profile is required.", 403, "TEACHER_ASSIGNMENT_REQUIRED");
	const assignment = await repository.findTeacherAssignment({
		staffId: staff.id,
		classId,
		subjectId,
		AND: [
			{ OR: [{ sessionId: null }, { sessionId }] },
			{ OR: [{ termId: null }, { termId }] }
		]
	});
	if (!assignment) throw new AppError("You are not assigned to this class and subject for the selected session and term.", 403, "TEACHER_ASSIGNMENT_REQUIRED");
	return staff.id;
};

const termReferences = async ({ classId, subjectId, sessionId, termId }) => {
	const [schoolClass, session, term, classSubject] = await Promise.all([
		repository.findClass(classId), repository.findSession(sessionId), repository.findTerm(termId),
		repository.findClassSubject(classId, subjectId)
	]);
	if (!schoolClass || !schoolClass.isActive) throw new NotFoundError("Active class not found");
	if (!session) throw new NotFoundError("Academic session not found");
	if (!term || term.sessionId !== sessionId) throw new AppError("Term does not belong to the selected academic session.", 409, "TERM_SESSION_MISMATCH");
	if (!canEnterTermAssessment(schoolClass.classLevel.code, term.type)) throw new AppError("Third-term assessments are not available for JSS3 or SS3.", 409, "GRADUATING_CLASS_THIRD_TERM_DISABLED");
	if (!classSubject || !classSubject.subject.isActive) throw new AppError("Subject is not assigned to this class.", 409, "SUBJECT_NOT_ASSIGNED_TO_CLASS");
	return { schoolClass, session, term, classSubject };
};

const hasSubjectRegistration = (enrollment, classSubject) => {
	if (enrollment.subjectRegistrations.length) {
		return enrollment.subjectRegistrations.some((registration) => registration.classSubjectId === classSubject.id);
	}
	const isSeniorSecondary = enrollment.class.classLevel.code.startsWith("SS");
	if (!isSeniorSecondary) return true;
	return classSubject.subject.departmentId == null || classSubject.subject.departmentId === enrollment.departmentId;
};

const getEntrySheet = async (query, user) => {
	const { classId, subjectId, sessionId, termId } = query;
	const staffId = await assertTeacherAssignment(user, { classId, subjectId, sessionId, termId });
	const { schoolClass, session, term, classSubject } = await termReferences({ classId, subjectId, sessionId, termId });
	const configuration = await getConfiguration(user);
	const enrollments = await repository.findEnrollmentRoster(classId, sessionId, termId);
	const eligible = enrollments.filter((enrollment) => hasSubjectRegistration(enrollment, classSubject));
	const studentIds = eligible.map((enrollment) => enrollment.studentId);
	const reports = studentIds.length ? await prisma.reportCard.findMany({
		where: { studentId: { in: studentIds }, sessionId, termId },
		include: { entries: { where: { subjectId } } }
	}) : [];
	const entryByStudent = new Map(reports.map((report) => [report.studentId, report.entries[0]]));
	const students = eligible.map(({ student }) => {
		const entry = entryByStudent.get(student.id);
		return {
			id: student.id,
			fullName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
			registrationNumber: student.registrationNumber,
			email: student.user.email,
			scores: entry ? {
				firstTest: Number(entry.firstTest || 0),
				secondTest: Number(entry.secondTest || 0),
				exam: Number(entry.exam || 0),
				total: Number(entry.total || 0),
				grade: entry.grade,
				remark: entry.remark,
				teacherComment: entry.teacherComment
			} : null
		};
	});
	return {
		class: schoolClass,
		subject: classSubject.subject,
		session,
		term,
		teacherId: staffId,
		configuration: {
			firstTestMax: Number(configuration.firstTestMax),
			secondTestMax: Number(configuration.secondTestMax),
			examMax: Number(configuration.examMax),
			gradeBands: configuration.gradeBands
		},
		students,
		submitted: students.filter((student) => student.scores).length,
		pending: students.filter((student) => !student.scores).length
	};
};

const saveEntries = async (data, user) => {
	const staffId = await assertTeacherAssignment(user, data);
	const canCorrectPublished = await canManageResults(user);
	const { schoolClass, classSubject } = await termReferences(data);
	const configuration = await getConfiguration(user);
	const sheet = await getEntrySheet(data, user);
	const eligibleIds = new Set(sheet.students.map((student) => student.id));
	const seenStudentIds = new Set();
	for (const item of data.entries) {
		if (seenStudentIds.has(item.studentId)) throw new AppError("A student can appear only once in a score submission.", 422, "DUPLICATE_STUDENT_SCORE");
		seenStudentIds.add(item.studentId);
		if (!eligibleIds.has(item.studentId)) throw new AppError("Student is not enrolled in the selected class, term, or subject.", 403, "STUDENT_SUBJECT_MISMATCH");
		try {
			calculateAssessment(item, configuration);
		} catch (error) {
			throw new AppError(error.message, 422, "SCORE_OUT_OF_RANGE", { field: error.field, studentId: item.studentId });
		}
	}

	const saved = await prisma.$transaction(async (tx) => {
		const resultRows = [];
		for (const item of data.entries) {
			const where = { studentId_sessionId_termId: { studentId: item.studentId, sessionId: data.sessionId, termId: data.termId } };
			const existingReport = await tx.reportCard.findUnique({ where, include: { entries: true } });
			if (existingReport?.published && !canCorrectPublished) throw new AppError("Published results can only be changed by an authorized administrator.", 403, "REPORT_CARD_LOCKED");
			if (existingReport?.published && canCorrectPublished && !data.reason?.trim()) throw new AppError("An administrative reason is required to edit a published result.", 400, "REASON_REQUIRED");

			const report = existingReport || await tx.reportCard.create({
				data: { studentId: item.studentId, sessionId: data.sessionId, termId: data.termId, classId: schoolClass.id }
			});
			const existingEntry = await tx.reportCardEntry.findUnique({ where: { reportCardId_subjectId: { reportCardId: report.id, subjectId: data.subjectId } } });
			const calculated = calculateAssessment(item, configuration);
			const entry = await tx.reportCardEntry.upsert({
				where: { reportCardId_subjectId: { reportCardId: report.id, subjectId: data.subjectId } },
				create: {
					reportCardId: report.id,
					subjectId: data.subjectId,
					teacherId: staffId,
					createdById: user.userId,
					updatedById: user.userId,
					firstTest: item.firstTest,
					secondTest: item.secondTest,
					exam: item.exam,
					total: calculated.total,
					grade: calculated.grade,
					remark: calculated.remark,
					teacherComment: item.teacherComment || null
				},
				update: {
					teacherId: staffId || existingEntry.teacherId,
					updatedById: user.userId,
					firstTest: item.firstTest,
					secondTest: item.secondTest,
					exam: item.exam,
					total: calculated.total,
					grade: calculated.grade,
					remark: calculated.remark,
					teacherComment: item.teacherComment || null
				},
				include: { subject: true }
			});
			if (existingReport?.published) {
				await tx.auditLog.create({
					data: {
						userId: user.userId,
						action: "CORRECT_PUBLISHED_RESULT",
						entity: "ReportCardEntry",
						entityId: entry.id,
						description: `Corrected a published result. Reason: ${data.reason.trim()}`
					}
				});
			}
			const allEntries = await tx.reportCardEntry.findMany({ where: { reportCardId: report.id } });
			const totalScore = sum(allEntries.map((row) => row.total));
			const totalPossible = allEntries.length * (Number(configuration.firstTestMax) + Number(configuration.secondTestMax) + Number(configuration.examMax));
			await tx.reportCard.update({
				where: { id: report.id },
				data: { classId: schoolClass.id, totalScore, totalPossible, average: totalPossible ? (totalScore / totalPossible) * 100 : 0 }
			});
			resultRows.push(entry);
		}
		return resultRows;
	});

	await prisma.auditLog.create({
		data: {
			userId: user.userId,
			action: "SAVE_TERM_RESULTS",
			entity: "ReportCard",
			entityId: saved[0]?.reportCardId || null,
			description: `Saved ${saved.length} ${classSubject.subject.name} result(s) for ${schoolClass.name}, ${data.termId}`
		}
	});
	return { saved, count: saved.length };
};

const getById = async (id, user) => {
	const report = await repository.findById(id);
	if (!report) throw new NotFoundError("Report card not found");
	if (!user) throw new AppError("Authentication required.", 401, "UNAUTHENTICATED");
	if (user.role === "STUDENT" && report.student.userId !== user.userId) throw new AppError("You can only view your own report card.", 403, "REPORT_CARD_ACCESS_DENIED");
	if (user.role === "STUDENT" && !report.published) throw new AppError("This report card has not been published.", 403, "REPORT_CARD_NOT_PUBLISHED");
	if (user.role === "TEACHER") {
		const staff = await repository.findStaffByUserId(user.userId);
		const allowedEntries = staff ? await Promise.all(report.entries.map(async (entry) => Boolean(await repository.findTeacherAssignment({
			staffId: staff.id, classId: report.classId, subjectId: entry.subjectId,
			AND: [{ OR: [{ sessionId: null }, { sessionId: report.sessionId }] }, { OR: [{ termId: null }, { termId: report.termId }] }]
		})))) : [];
		report.entries = report.entries.filter((entry, index) => allowedEntries[index]);
		if (!report.entries.length) throw new AppError("You are not assigned to this student's results.", 403, "REPORT_CARD_ACCESS_DENIED");
	} else if (user.role !== "STUDENT" && !(await isAdmin(user.role)) && !(await hasPermission(user, "results:view"))) {
		throw new AppError("You cannot view this report card.", 403, "REPORT_CARD_ACCESS_DENIED");
	}
	return report;
};

const validateLegacyReport = async (data) => {
	const [student, session, term, enrollment] = await Promise.all([
		repository.findStudent(data.studentId),
		repository.findSession(data.sessionId),
		repository.findTerm(data.termId),
		repository.findEnrollment(data.studentId, data.sessionId, data.termId),
	]);
	if (!student) throw new NotFoundError("Student not found");
	if (!session || !term) throw new NotFoundError("Academic session or term not found");
	if (term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");
	if (!enrollment || !["ACTIVE", "COMPLETED"].includes(enrollment.status)) throw new AppError("Student is not enrolled in this session and term.", 409, "STUDENT_ENROLLMENT_REQUIRED");
	if (data.classId && data.classId !== enrollment.classId) throw new AppError("Student is not enrolled in the selected class.", 409, "STUDENT_CLASS_MISMATCH");
	for (const item of data.entries) {
		const classSubject = await repository.findClassSubject(enrollment.classId, item.subjectId);
		if (!classSubject || !classSubject.subject.isActive || !hasSubjectRegistration(enrollment, classSubject)) {
			throw new AppError("Subject is not registered for this student in the selected class.", 409, "STUDENT_SUBJECT_MISMATCH");
		}
	}
	return enrollment.classId;
};

const buildData = (data, configuration) => {
	const entries = data.entries.map((item) => {
		const calculated = calculateAssessment(item, configuration);
		return {
			subjectId: item.subjectId,
			firstTest: item.firstTest ?? null,
			secondTest: item.secondTest ?? null,
			assignment: item.assignment ?? null,
			exam: item.exam ?? null,
			total: calculated.total,
			grade: calculated.grade,
			remark: calculated.remark,
			teacherComment: item.teacherComment ?? null
		};
	});
	const totalScore = sum(entries.map((item) => item.total));
	const totalPossible = entries.length * (Number(configuration.firstTestMax) + Number(configuration.secondTestMax) + Number(configuration.examMax));
	return { totalScore, totalPossible, average: totalPossible ? (totalScore / totalPossible) * 100 : 0, teacherComment: data.teacherComment ?? null, principalComment: data.principalComment ?? null, entries: { deleteMany: {}, create: entries } };
};

const create = async (data, user) => {
	if (!(await canManageResults(user))) throw new AppError("Use the assigned class and subject result-entry workflow.", 403, "REPORT_CARD_ACCESS_DENIED");
	const classId = await validateLegacyReport(data);
	const configuration = await getConfiguration(user);
	return repository.upsert(
		{ studentId_sessionId_termId: { studentId: data.studentId, sessionId: data.sessionId, termId: data.termId } },
		{ studentId: data.studentId, sessionId: data.sessionId, termId: data.termId, classId, ...buildData(data, configuration) }
	);
};

const update = async (id, data, user) => {
	if (!(await canManageResults(user))) throw new AppError("Use the assigned class and subject result-entry workflow.", 403, "REPORT_CARD_ACCESS_DENIED");
	const current = await repository.findById(id);
	if (!current) throw new NotFoundError("Report card not found");
	if (data.entries) {
		await validateLegacyReport({
			studentId: current.studentId,
			sessionId: current.sessionId,
			termId: current.termId,
			classId: current.classId,
			entries: data.entries,
		});
		const configuration = await getConfiguration(user);
		return repository.update(id, buildData({ ...data, entries: data.entries }, configuration));
	}
	return repository.update(id, data);
};

const publish = async (id, published, user) => {
	if (!(await canManageResults(user))) throw new AppError("Only authorized administrators can publish report cards.", 403, "REPORT_CARD_PUBLISH_DENIED");
	return prisma.$transaction(async (tx) => {
		const report = await tx.reportCard.findUnique({ where: { id }, include: { entries: true } });
		if (!report) throw new NotFoundError("Report card not found");
		if (published) await assertReportComplete(tx, report);
		const updated = await tx.reportCard.update({ where: { id }, data: { published } });
		await tx.auditLog.create({ data: {
			userId: user.userId,
			action: published ? "PUBLISH_REPORT_CARD" : "UNPUBLISH_REPORT_CARD",
			entity: "ReportCard",
			entityId: id,
			description: `${published ? "Published" : "Unpublished"} report card for student ${report.studentId}, session ${report.sessionId}, term ${report.termId}`,
		} });
		return updated;
	}, { isolationLevel: "Serializable" });
};

const assertReportComplete = async (tx, report) => {
	const enrollment = await tx.enrollment.findUnique({
		where: { studentId_sessionId_termId: { studentId: report.studentId, sessionId: report.sessionId, termId: report.termId } },
		include: { class: { include: { classLevel: true } }, subjectRegistrations: { include: { classSubject: true } } },
	});
	if (!enrollment || enrollment.status !== "ACTIVE") throw new AppError("An active enrollment is required before publishing this result.", 409, "STUDENT_ENROLLMENT_REQUIRED");
	const classSubjects = await tx.classSubject.findMany({ where: { classId: enrollment.classId, subject: { isActive: true } }, include: { subject: true } });
	const expectedSubjectIds = enrollment.subjectRegistrations.length
		? enrollment.subjectRegistrations.map((registration) => registration.classSubjectId)
		: classSubjects.filter(({ subject }) => !enrollment.class.classLevel.code.startsWith("SS") || !subject.departmentId || subject.departmentId === enrollment.departmentId).map(({ id }) => id);
	const completedIds = new Set(report.entries.map((entry) => classSubjects.find((classSubject) => classSubject.subjectId === entry.subjectId)?.id).filter(Boolean));
	const missingCount = expectedSubjectIds.filter((id) => !completedIds.has(id)).length;
	if (!expectedSubjectIds.length || missingCount) throw new AppError("Every registered subject must have a result before publishing.", 409, "REPORT_CARD_INCOMPLETE", { missingSubjects: missingCount });
};

const publishClassTerm = async (data, user) => {
	if (!(await canManageResults(user))) throw new AppError("Only authorized administrators can publish report cards.", 403, "REPORT_CARD_PUBLISH_DENIED");
	return prisma.$transaction(async (tx) => {
		const [schoolClass, session, term] = await Promise.all([
			tx.class.findUnique({ where: { id: data.classId } }),
			tx.academicSession.findUnique({ where: { id: data.sessionId } }),
			tx.term.findUnique({ where: { id: data.termId } }),
		]);
		if (!schoolClass || !schoolClass.isActive) throw new NotFoundError("Active class not found");
		if (!session) throw new NotFoundError("Academic session not found");
		if (!term || term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");
		const enrollments = await tx.enrollment.findMany({ where: { classId: schoolClass.id, sessionId: session.id, termId: term.id, status: "ACTIVE" }, select: { studentId: true } });
		if (!enrollments.length) throw new AppError("There are no active students enrolled in this class and term.", 409, "NO_ACTIVE_ENROLLMENTS");
		const studentIds = enrollments.map(({ studentId }) => studentId);
		const reports = await tx.reportCard.findMany({
			where: { classId: schoolClass.id, studentId: { in: studentIds }, sessionId: session.id, termId: term.id },
			include: { entries: true },
		});
		const reportByStudent = new Map(reports.map((report) => [report.studentId, report]));
		if (data.published) {
			for (const studentId of studentIds) {
				const report = reportByStudent.get(studentId);
				if (!report) throw new AppError("Every enrolled student must have a report card before class results can be published.", 409, "CLASS_RESULTS_INCOMPLETE");
				await assertReportComplete(tx, report);
			}
		}
		const result = await tx.reportCard.updateMany({
			where: { classId: schoolClass.id, studentId: { in: studentIds }, sessionId: session.id, termId: term.id },
			data: { published: data.published },
		});
		await tx.auditLog.create({ data: {
			userId: user.userId,
			action: data.published ? "PUBLISH_CLASS_TERM_RESULTS" : "UNPUBLISH_CLASS_TERM_RESULTS",
			entity: "ReportCard",
			entityId: reports[0]?.id || null,
			description: `${data.published ? "Published" : "Unpublished"} ${result.count} report cards for ${schoolClass.name}, ${session.name}, ${term.name}`,
		} });
		return { count: result.count, published: data.published };
	}, { isolationLevel: "Serializable" });
};

const getAll = async (query, user) => {
	if (!user || (!isAdmin(user.role) && !["TEACHER", "STUDENT"].includes(user.role) && !(await hasPermission(user, "results:view")))) {
		throw new AppError("You cannot view these report cards.", 403, "REPORT_CARD_ACCESS_DENIED");
	}
	const where = {};
	if (query.studentId) where.studentId = query.studentId;
	if (query.sessionId) where.sessionId = query.sessionId;
	if (query.termId) where.termId = query.termId;
	if (query.classId) where.classId = query.classId;
	if (query.published !== undefined) where.published = query.published === "true";
	if (query.subjectId) where.entries = { some: { subjectId: query.subjectId } };
	if (query.teacherId) where.entries = { ...(where.entries || {}), some: { ...(where.entries?.some || {}), teacherId: query.teacherId } };
	if (user.role === "STUDENT") {
		where.student = { userId: user.userId };
		where.published = true;
	}
	let assignments = [];
	if (user.role === "TEACHER") {
		const staff = await repository.findStaffByUserId(user.userId);
		if (!staff) return [];
		assignments = await prisma.teacherAssignment.findMany({
			where: {
				staffId: staff.id,
				...(query.classId ? { classId: query.classId } : {}),
				...(query.subjectId ? { subjectId: query.subjectId } : {}),
				...(query.sessionId ? { OR: [{ sessionId: null }, { sessionId: query.sessionId }] } : {}),
				...(query.termId ? { OR: [{ termId: null }, { termId: query.termId }] } : {})
			},
			select: { classId: true, subjectId: true, sessionId: true, termId: true }
		});
		if (!assignments.length) return [];
		where.OR = assignments.map((assignment) => ({
			classId: assignment.classId,
			...(assignment.sessionId ? { sessionId: assignment.sessionId } : {}),
			...(assignment.termId ? { termId: assignment.termId } : {}),
			entries: { some: { subjectId: assignment.subjectId } }
		}));
	}
	const reports = await repository.findAll(where);
	if (user.role !== "TEACHER") return reports;
	return reports.map((report) => ({ ...report, entries: report.entries.filter((entry) => assignments.some((assignment) =>
		assignment.classId === report.classId && assignment.subjectId === entry.subjectId
		&& (!assignment.sessionId || assignment.sessionId === report.sessionId)
		&& (!assignment.termId || assignment.termId === report.termId)
	)) })).filter((report) => report.entries.length);
};

module.exports = { create, update, getById, publish, publishClassTerm, getAll, getConfiguration, updateConfiguration, getEntrySheet, saveEntries, canManageResults };
