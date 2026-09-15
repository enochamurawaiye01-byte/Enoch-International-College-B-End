const gradeFor = (percentage) => percentage >= 75 ? "A" : percentage >= 65 ? "B" : percentage >= 55 ? "C" : percentage >= 45 ? "D" : percentage >= 40 ? "E" : "F";
const sum = (values) => values.reduce((total, value) => total + (value == null ? 0 : Number(value)), 0);
module.exports = { gradeFor, sum };
