const generateRegistrationNumber = async (tx, fullName, admissionDate = new Date()) => {
  const year = new Date(admissionDate).getFullYear();

  const nameParts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let letters;

  if (nameParts.length >= 3) {
    letters =
      nameParts[0][0] +
      nameParts[1][0] +
      nameParts[2][0];
  } else if (nameParts.length === 2) {
    letters =
      nameParts[0][0] +
      nameParts[1][0] +
      nameParts[0][1];
  } else {
    letters = nameParts[0].slice(0, 3);
  }

  letters = letters.toUpperCase();

  while (true) {
    const randomNumber = Math.floor(100 + Math.random() * 900);

    const registrationNumber = `${year}-${randomNumber}-${letters}`;

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