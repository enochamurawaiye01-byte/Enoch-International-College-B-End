const test = require("node:test");
const assert = require("node:assert/strict");
const { isAllowedOrigin } = require("../../src/config/cors");

test("CORS allows the Mercy International College Vercel deployment origins", () => {
	assert.equal(isAllowedOrigin("https://mercy-international-college.vercel.app"), true);
	assert.equal(isAllowedOrigin("https://mercy-international-college-iy5gx5vqw.vercel.app"), true);
	assert.equal(isAllowedOrigin("https://mercyt-international-college.vercel.app"), true);
	assert.equal(isAllowedOrigin("https://mercyt-international-college-3gcpq6cbd.vercel.app"), true);
});

test("CORS rejects unrelated Vercel deployments and insecure matching origins", () => {
	assert.equal(isAllowedOrigin("https://unrelated-school.vercel.app"), false);
	assert.equal(isAllowedOrigin("http://mercy-international-college-test.vercel.app"), false);
});
