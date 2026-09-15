const repository = require("./transcript.repository");
const getCsv = async (query) => {
    const where = {};
    if (query.studentId) where.id = query.studentId;
    if (query.classId) where.currentClassId = query.classId;
    const students = await repository.findStudents(where);
    const lines = ["Student,Registration Number,Class,Subject,Exam,Session,Term,Score,Total Marks,Percentage,Status"];
    for (const student of students) for (const result of student.results) lines.push([`${student.firstName} ${student.lastName}`, student.registrationNumber, student.currentClass?.name || "", result.exam.subject.name, result.exam.title, result.session.name, result.term.name, result.score, result.totalMarks, result.percentage, result.status].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    return lines.join("\r\n");
};
module.exports = { getCsv };