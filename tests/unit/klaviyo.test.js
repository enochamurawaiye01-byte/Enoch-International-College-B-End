const test = require("node:test");
const assert = require("node:assert/strict");
const klaviyoService = require("../../src/modules/klaviyo/klaviyo.service");

test("Klaviyo Integration Unit Tests", async (t) => {
  await t.test("should reject subscription without email", async () => {
    await assert.rejects(
      async () => {
        await klaviyoService.subscribeProfileToList({ email: "" });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  await t.test("should gracefully handle profile subscription call format", async () => {
    // When environment variables are configured, call should attempt subscription
    const result = await klaviyoService.subscribeProfileToList({
      email: "test.klaviyo.user@example.com",
      firstName: "Test",
      lastName: "User",
    });

    assert.ok(typeof result.success === "boolean");
    assert.ok(typeof result.message === "string");
  });
});
