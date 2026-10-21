const { generateStudentRegistrationNumber } = require("./registration-identifiers");

const generateRegistrationNumber = (tx, fullName) => generateStudentRegistrationNumber(tx, fullName);

module.exports = generateRegistrationNumber;
