const assert = require("assert");
const { describe, it } = require("node:test");
const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } = require("../../src/core/utils/jwt");
const { calculateGrade } = require("../../src/modules/results/result.service");

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
