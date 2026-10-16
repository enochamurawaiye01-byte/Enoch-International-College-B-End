const { requiresDepartment } = require("./class-academic-rules");

const isSubjectAvailable = (subject, classLevelCode, departmentIds) => {
	const selectedDepartments = Array.isArray(departmentIds) ? departmentIds : [departmentIds].filter(Boolean);
	const targets = subject.targets || [];
	if (targets.length) {
		return targets.some((target) =>
			target.classLevel?.code === classLevelCode
			&& (target.departmentId == null || selectedDepartments.includes(target.departmentId))
		);
	}
	if (!requiresDepartment(classLevelCode)) return true;
	return !subject.departmentId || selectedDepartments.includes(subject.departmentId);
};

module.exports = { isSubjectAvailable };
