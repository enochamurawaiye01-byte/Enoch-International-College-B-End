const crypto = require("node:crypto");

const MIC_PREFIX = "MIC";
const MAX_COLLISION_RETRIES = 1000;

const normalizeLetters = (value) => String(value || "")
	.normalize("NFKD")
	.replace(/[\u0300-\u036f]/g, "")
	.replace(/[^a-z]/gi, "")
	.toUpperCase();

const getNameParts = (name) => {
	if (name && typeof name === "object") {
		return {
			firstName: name.firstName,
			lastName: name.lastName || name.surname
		};
	}
	const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
	return { firstName: parts[0], lastName: parts.length > 1 ? parts[parts.length - 1] : "" };
};

const getInitials = (name) => {
	const { firstName, lastName } = getNameParts(name);
	const first = normalizeLetters(firstName);
	const surname = normalizeLetters(lastName);
	if (!first || surname.length < 2) {
		throw new Error("A first name and a surname with at least two letters are required to generate a registration number.");
	}
	return `${surname.slice(0, 2)}${first[0]}`;
};

const lockIdentifierScope = async (tx, scope) => {
	if (typeof tx.$queryRaw === "function") {
		await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${scope}))`;
	}
};

const generateUniqueIdentifier = async ({ tx, name, entity, staffNumber = false }) => {
	const initials = getInitials(name);
	const scope = `${MIC_PREFIX}/${staffNumber ? "STF/" : ""}${initials}`;
	const delegate = staffNumber ? tx.staff : tx.student;
	if (!delegate?.findUnique) throw new TypeError("A transactional Prisma client is required to generate a registration number.");
	await lockIdentifierScope(tx, scope);

	for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt += 1) {
		const digits = String(crypto.randomInt(0, 100000)).padStart(5, "0");
		const candidate = `${scope}/${digits}`;
		const existing = await delegate.findUnique({
			where: staffNumber ? { staffNumber: candidate } : { registrationNumber: candidate },
			select: { id: true }
		});
		if (!existing) return candidate;
	}
	throw new Error(`Unable to generate a unique ${entity} registration number after ${MAX_COLLISION_RETRIES} attempts.`);
};

module.exports = {
	getInitials,
	generateStudentRegistrationNumber: (tx, name) => generateUniqueIdentifier({ tx, name, entity: "student" }),
	generateStaffRegistrationNumber: (tx, name) => generateUniqueIdentifier({ tx, name, entity: "staff", staffNumber: true })
};
