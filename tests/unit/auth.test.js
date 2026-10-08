const assert = require("assert");
const { describe, it } = require("node:test");
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

    it("allows teacher applications without a student class or applicant-provided staff number", () => {
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
    it("uses a sequential MIC identifier and skips an existing number", async () => {
        const issued = new Set();
        const existingNumber = "MIC/2026/000001";
        issued.add(existingNumber);
        let nextValue = 0;
        const client = {
            $queryRaw: async () => [{ value: ++nextValue }],
            student: {
                findUnique: async ({ where }) => {
                    return issued.has(where.registrationNumber) ? { id: "existing" } : null;
                },
            },
        };
        const generated = [];
        for (let index = 0; index < 100; index += 1) {
            const registrationNumber = await generateRegistrationNumber(client, "Jordan Adebayo", new Date("2026-06-01T00:00:00Z"));
            generated.push(registrationNumber);
            issued.add(registrationNumber);
        }

        assert.ok(generated.every((registrationNumber) => /^MIC\/2026\/\d{6}$/.test(registrationNumber)));
        assert.equal(new Set(generated).size, 100);
        assert.ok(!generated.includes(existingNumber));
        assert.equal(generated[0], "MIC/2026/000002");
        assert.equal(generated[1], "MIC/2026/000003");
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
        assert.deepEqual(numbers.slice(0, 3), ["MIC/2026/000001", "MIC/2026/000002", "MIC/2026/000003"]);
    });
});
