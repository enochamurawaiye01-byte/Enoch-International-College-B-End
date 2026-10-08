const AppError = require("../../core/errors/AppError");
const NotFoundError = require("../../core/errors/NotFoundError");
const repository = require("./enrollment.repository");
const { requiresDepartment } = require("../../core/utils/class-academic-rules");
const validateReferences = async (data) => {
	const [student, session, term, schoolClass] = await Promise.all([repository.findStudent(data.studentId), repository.findSession(data.sessionId), repository.findTerm(data.termId), repository.findClass(data.classId)]);
	if (!student) throw new NotFoundError("Student not found");
	if (student.status !== "ACTIVE") throw new AppError("Only active students can be enrolled.", 409, "STUDENT_NOT_ACTIVE");
	if (!session) throw new NotFoundError("Academic session not found");
	if (!term) throw new NotFoundError("Term not found");
	if (!schoolClass || !schoolClass.isActive) throw new NotFoundError("Active class not found");
	if (term.sessionId !== session.id) throw new AppError("Term does not belong to the selected session.", 409, "TERM_SESSION_MISMATCH");
	const isSeniorSecondary = requiresDepartment(schoolClass.classLevel.code);
	if (isSeniorSecondary && !data.departmentId) throw new AppError("A department is required for senior secondary enrollment.", 422, "STUDENT_DEPARTMENT_REQUIRED");
	if (data.departmentId && !(await repository.findDepartment(data.departmentId))) throw new NotFoundError("Department not found");
	if (!isSeniorSecondary && data.departmentId) throw new AppError("Departments are only valid for senior secondary enrollment.", 422, "STUDENT_DEPARTMENT_NOT_ALLOWED");
	return { schoolClass };
};
const create = async (data) => {
	const { schoolClass } = await validateReferences(data);
	if (await repository.findDuplicate(data.studentId, data.sessionId, data.termId)) throw new AppError("Student is already enrolled for this session and term.", 409, "ENROLLMENT_EXISTS");
	const classSubjects = await repository.findClassSubjects(data.classId);
	const applicableSubjects = classSubjects.filter(({ subject }) => !requiresDepartment(schoolClass.classLevel.code) || !subject.departmentId || subject.departmentId === data.departmentId);
	return repository.createWithSubjectRegistrations({ ...data, currentTerm: term.name, departmentId: data.departmentId || null, status: data.status || "ACTIVE", enrollmentDate: new Date() }, applicableSubjects.map((item) => item.id));
};
const getAll = (query) => { const filters = {}; ["studentId", "sessionId", "termId", "classId", "status"].forEach((key) => { if (query[key]) filters[key] = query[key]; }); return repository.findAll(filters); };
const getById = async (id) => { const enrollment = await repository.findById(id); if (!enrollment) throw new NotFoundError("Enrollment not found"); return enrollment; };
const update = async (id, data) => { await getById(id); const updateData = { status: data.status }; if (data.completionDate !== undefined) updateData.completionDate = data.completionDate; else if (data.status === "COMPLETED") updateData.completionDate = new Date(); return repository.update(id, updateData); };
const getSubjects = async (id) => { await getById(id); return repository.findById(id).then((enrollment) => enrollment.subjectRegistrations); };
const replaceSubjects = async (id, subjectIds) => {
	const enrollment = await getById(id);
	const classSubjects = await repository.findClassSubjects(enrollment.classId);
	const bySubjectId = new Map(classSubjects.map((item) => [item.subjectId, item]));
	const uniqueIds = [...new Set(subjectIds)];
	const invalid = uniqueIds.map((subjectId) => bySubjectId.get(subjectId)).find((item) => !item);
	if (invalid) throw new AppError("Every selected subject must be assigned to the student's class.", 409, "SUBJECT_NOT_ASSIGNED_TO_CLASS");
	const selected = uniqueIds.map((subjectId) => bySubjectId.get(subjectId));
	if (requiresDepartment(enrollment.class.classLevel.code) && selected.some((item) => item.subject.departmentId && item.subject.departmentId !== enrollment.departmentId)) {
		throw new AppError("The selected subject does not match the student's department.", 409, "SUBJECT_DEPARTMENT_MISMATCH");
	}
	return repository.replaceSubjectRegistrations(id, selected.map((item) => item.id));
};
module.exports = { create, getAll, getById, update, getSubjects, replaceSubjects };
