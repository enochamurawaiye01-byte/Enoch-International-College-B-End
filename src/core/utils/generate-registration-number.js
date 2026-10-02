const { randomBytes } = require("node:crypto");

const generateRegistrationNumber = async (tx, fullName, admissionDate = new Date()) => {
  const year = new Date(admissionDate).getFullYear();

  while (true) {
    const registrationNumber = `STU/${year}/${randomBytes(8).toString("hex").toUpperCase()}`;

    const existingStudent = await tx.student.findUnique({
      where: {
        registrationNumber,
      },
    });

    if (!existingStudent) {
      return registrationNumber;
    }
  }
};

module.exports = generateRegistrationNumber;