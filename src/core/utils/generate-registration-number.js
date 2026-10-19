const crypto = require("node:crypto");

const SUFFIX_SPACE = 10_000;

const greatestCommonDivisor = (left, right) => {
  while (right) {
    [left, right] = [right, left % right];
  }
  return left;
};

const suffixParameters = (scope) => {
  const seed = crypto.createHash("sha256").update(scope).digest();
  const offset = seed.readUInt32BE(0) % SUFFIX_SPACE;
  let step = seed.readUInt32BE(4) % SUFFIX_SPACE;
  if (step === 0) step = 1;
  while (greatestCommonDivisor(step, SUFFIX_SPACE) !== 1) {
    step = (step + 1) % SUFFIX_SPACE || 1;
  }
  return { offset, step };
};

const generateRegistrationNumber = async (tx, fullName, admissionDate = new Date(), schoolId = null) => {
  const year = new Date(admissionDate).getFullYear();
  const school = schoolId
    ? await tx.school.findUnique({ where: { id: schoolId }, select: { registrationPrefix: true } })
    : null;
  const prefix = school?.registrationPrefix || "MIC";
  const scope = `${prefix}/${year}`;
  const { offset, step } = suffixParameters(scope);

  for (let attempts = 0; attempts < SUFFIX_SPACE; attempts += 1) {
    const [{ value }] = await tx.$queryRaw`
      INSERT INTO "RegistrationNumberCounter" ("scope", "value", "updatedAt")
      VALUES (${scope}, 1, NOW())
      ON CONFLICT ("scope") DO UPDATE
      SET "value" = "RegistrationNumberCounter"."value" + 1, "updatedAt" = NOW()
      RETURNING "value"
    `;
    const suffix = (offset + (Number(value) - 1) * step) % SUFFIX_SPACE;
    const registrationNumber = `${scope}/${String(suffix).padStart(4, "0")}`;

    const existingStudent = await tx.student.findUnique({
      where: {
        registrationNumber,
      },
    });

    if (!existingStudent) {
      return registrationNumber;
    }
  }

  throw new Error(`No four-digit student registration numbers remain for ${scope}.`);
};

module.exports = generateRegistrationNumber;