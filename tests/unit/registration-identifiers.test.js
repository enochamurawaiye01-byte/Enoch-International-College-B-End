const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
	getInitials,
	generateStudentRegistrationNumber,
	generateStaffRegistrationNumber,
} = require("../../src/core/utils/registration-identifiers");

test("registration initials use the first two surname letters and first first-name letter", () => {
	assert.equal(getInitials({ firstName: "Enoch", lastName: "Amurawaiye" }), "AME");
	assert.equal(getInitials({ firstName: " Ada ", lastName: "  O'Connor-Smith " }), "OCA");
});

test("student and staff numbers use the required five-digit formats", async () => {
	const oldRandomInt = crypto.randomInt;
	crypto.randomInt = () => 83639;
	const tx = {
		$queryRaw: async () => [],
		student: { findUnique: async () => null },
		staff: { findUnique: async () => null },
	};
	try {
		assert.equal(
			await generateStudentRegistrationNumber(tx, { firstName: "Enoch", lastName: "Amurawaiye" }),
			"MIC/AME/83639"
		);
		assert.equal(
			await generateStaffRegistrationNumber(tx, { firstName: "Enoch", lastName: "Amurawaiye" }),
			"MIC/STF/AME/83639"
		);
	} finally {
		crypto.randomInt = oldRandomInt;
	}
});

test("registration number generation retries an existing random candidate", async () => {
	const oldRandomInt = crypto.randomInt;
	const candidates = [7, 8];
	crypto.randomInt = () => candidates.shift();
	const checked = [];
	const tx = {
		$queryRaw: async () => [],
		student: {
			findUnique: async ({ where }) => {
				checked.push(where.registrationNumber);
				return checked.length === 1 ? { id: "existing-student" } : null;
			},
		},
	};
	try {
		assert.equal(
			await generateStudentRegistrationNumber(tx, { firstName: "Enoch", lastName: "Amurawaiye" }),
			"MIC/AME/00008"
		);
		assert.deepEqual(checked, ["MIC/AME/00007", "MIC/AME/00008"]);
	} finally {
		crypto.randomInt = oldRandomInt;
	}
});

test("staff registration number generation retries collisions with existing staff", async () => {
	const oldRandomInt = crypto.randomInt;
	const candidates = [12, 13];
	crypto.randomInt = () => candidates.shift();
	let lookupCount = 0;
	const tx = {
		$queryRaw: async () => [],
		staff: {
			findUnique: async ({ where }) => {
				lookupCount += 1;
				assert.equal(where.staffNumber, `MIC/STF/AME/${lookupCount === 1 ? "00012" : "00013"}`);
				return lookupCount === 1 ? { id: "existing-staff" } : null;
			},
		},
	};
	try {
		assert.equal(
			await generateStaffRegistrationNumber(tx, { firstName: "Enoch", lastName: "Amurawaiye" }),
			"MIC/STF/AME/00013"
		);
		assert.equal(lookupCount, 2);
	} finally {
		crypto.randomInt = oldRandomInt;
	}
});
