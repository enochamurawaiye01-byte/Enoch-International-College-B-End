const generateRegistrationNumber = async (tx, fullName, admissionDate = new Date(), schoolId = null) => {
  const year = new Date(admissionDate).getFullYear();
  const school = schoolId
    ? await tx.school.findUnique({ where: { id: schoolId }, select: { registrationPrefix: true } })
    : null;
  const prefix = school?.registrationPrefix || "MIC";
  const scope = `${prefix}/${year}`;

  while (true) {
    const [{ value }] = await tx.$queryRaw`
      INSERT INTO "RegistrationNumberCounter" ("scope", "value", "updatedAt")
      VALUES (${scope}, 1, NOW())
      ON CONFLICT ("scope") DO UPDATE
      SET "value" = "RegistrationNumberCounter"."value" + 1, "updatedAt" = NOW()
      RETURNING "value"
    `;
    const registrationNumber = `${prefix}/${year}/${String(value).padStart(6, "0")}`;

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