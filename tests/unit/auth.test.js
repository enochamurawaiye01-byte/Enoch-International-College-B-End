const assert = require("assert");
const { describe, it } = require("node:test");
const crypto = require("node:crypto");
const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } = require("../../src/core/utils/jwt");
const { calculateGrade } = require("../../src/modules/results/result.service");
const { registerSchema } = require("../../src/modules/auth/auth.validator");
const { loginSchema } = require("../../src/modules/auth/auth.validator");
const generateRegistrationNumber = require("../../src/core/utils/generate-registration-number");
const { requiresDepartment } = require("../../src/core/utils/class-academic-rules");

describe("Auth & Token Verification Unit Tests", () => {

    process.env.JWT_SECRET = "test-secret-key-1234567890";

    it("should generate and verify an access token with access purpose", () => {
        const payload = { userId: "user-123", role: "ADMIN" };
        const token = generateAccessToken(payload);
        const decoded = verifyAccessToken(token);

        assert.strictEqual(decoded.userId, "user-123");
        assert.strictEqual(decoded.role, "ADMIN");
        assert.strictEqual(decoded.purpose, "access");
    });

    it("should generate and verify a refresh token with refresh purpose", () => {
        const payload = { userId: "user-123" };
        const token = generateRefreshToken(payload);
        const decoded = verifyRefreshToken(token);

        assert.strictEqual(decoded.userId, "user-123");
        assert.strictEqual(decoded.purpose, "refresh");
    });

    it("should reject access token verification if token purpose is not access", () => {
        const token = generateRefreshToken({ userId: "user-123" });
        assert.throws(() => {
            verifyAccessToken(token);
        }, /Invalid token purpose/);
    });
});

describe("Result Grade Calculation Unit Tests", () => {
    it("should calculate correct letter grades according to grading scale", () => {
        assert.strictEqual(calculateGrade(75), "A");
        assert.strictEqual(calculateGrade(70), "A");
        assert.strictEqual(calculateGrade(65), "B");
        assert.strictEqual(calculateGrade(55), "C");
        assert.strictEqual(calculateGrade(48), "D");
        assert.strictEqual(calculateGrade(42), "F");
    });
});

describe("Registration application validation", () => {
    const baseApplication = {
        firstName: "Jordan",
        lastName: "Adebayo",
        email: "jordan@example.com",
        phoneNumber: "+2348012345678",
        password: "Password123!",
        confirmPassword: "Password123!",
    };

    it("allows teacher applications without a student class, staff number, or application-letter upload", () => {
        const result = registerSchema.safeParse({ ...baseApplication, role: "TEACHER" });
        assert.equal(result.success, true);
    });

    it("requires a database class selection for student applications", () => {
        const result = registerSchema.safeParse({ ...baseApplication, role: "STUDENT" });
        assert.equal(result.success, false);
        assert.ok(result.error.issues.some((issue) => issue.path.includes("currentClassId")));
    });
});

describe("Student registration number generation", () => {
    it("generates unique MIC initials with five-digit randomized suffixes", async () => {
        let nextValue = 0;
        const client = {
            $queryRaw: async () => [{ value: ++nextValue }],
            student: { findUnique: async () => null },
        };
        const generated = await Promise.all(Array.from({ length: 100 }, () =>
            generateRegistrationNumber(client, "Jordan Adebayo", new Date("2026-06-01T00:00:00Z"))
        ));

        assert.ok(generated.every((registrationNumber) => /^MIC\/[A-Z]{3}\/\d{5}$/.test(registrationNumber)));
        assert.equal(new Set(generated).size, 100);
        assert.notEqual(
            Number(generated[1].split("/").at(-1)),
            Number(generated[0].split("/").at(-1)) + 1
        );
    });

    it("skips an already-issued randomized suffix", async () => {
        const originalRandomInt = crypto.randomInt;
        const suffixes = [7, 7, 8];
        crypto.randomInt = () => suffixes.shift();
        const client = {
            $queryRaw: async () => [],
            student: { findUnique: async () => null },
        };
        try {
            const existingNumber = await generateRegistrationNumber(
                client,
                { firstName: "Jordan", lastName: "Adebayo" },
                new Date("2026-06-01T00:00:00Z")
            );
            let lookupCount = 0;
            client.student.findUnique = async ({ where }) => {
                lookupCount += 1;
                return where.registrationNumber === existingNumber ? { id: "existing" } : null;
            };
            const nextNumber = await generateRegistrationNumber(
                client,
                { firstName: "Jordan", lastName: "Adebayo" },
                new Date("2026-06-01T00:00:00Z")
            );

            assert.match(nextNumber, /^MIC\/[A-Z]{3}\/\d{5}$/);
            assert.notEqual(nextNumber, existingNumber);
            assert.equal(lookupCount, 2);
        } finally {
            crypto.randomInt = originalRandomInt;
        }
    });

    it("accepts registration number login and requires one identifier", () => {
        assert.equal(loginSchema.safeParse({ registrationNumber: "MIC/2026/000001", password: "secret" }).success, true);
        assert.equal(loginSchema.safeParse({ email: "student@example.com", password: "secret" }).success, true);
        assert.equal(loginSchema.safeParse({ password: "secret" }).success, false);
    });

    it("requires a department only for senior-secondary class levels", () => {
        assert.equal(requiresDepartment("JSS2"), false);
        assert.equal(requiresDepartment("SS2"), true);
        assert.equal(requiresDepartment(""), false);
    });

    it("generates unique numbers under concurrent requests", async () => {
        let nextValue = 0;
        const client = {
            $queryRaw: async () => [{ value: ++nextValue }],
            student: { findUnique: async () => null },
        };
        const numbers = await Promise.all(Array.from({ length: 100 }, () =>
            generateRegistrationNumber(client, "Jordan Adebayo", new Date("2026-06-01T00:00:00Z"))
        ));

        assert.equal(new Set(numbers).size, 100);
        assert.ok(numbers.every((number) => /^MIC\/[A-Z]{3}\/\d{5}$/.test(number)));
    });
});
