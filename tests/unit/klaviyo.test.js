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

  await t.test("Klaviyo approval events include role-specific details", async () => {
    const originalFetch = global.fetch;
    const originalPrivateKey = process.env.KLAVIYO_PRIVATE_API_KEY;
    const originalApiKey = process.env.KLAVIYO_API_KEY;
    const requests = [];
    process.env.KLAVIYO_PRIVATE_API_KEY = "klaviyo-test-key";
    global.fetch = async (url, options = {}) => {
      requests.push({ url, options });
      return { status: 202, ok: true, json: async () => ({}) };
    };

    try {
      const result = await klaviyoService.trackApprovalEvent({
        email: "teacher@school.invalid",
        name: "Daniel Teacher",
        username: "teacher@school.invalid",
        role: "TEACHER",
        registrationNumber: "MIC/STF/2026/001",
        department: "Science",
      });

      assert.equal(result.success, true);
      assert.equal(result.acceptedCount, 1);
      assert.equal(requests[0].url, "https://a.klaviyo.com/api/events/");
      assert.equal(requests[0].options.headers.Authorization, "Klaviyo-API-Key klaviyo-test-key");
      assert.equal(requests[0].options.headers.Revision, "2026-07-15");
      assert.equal(requests[0].options.headers["Content-Type"], "application/vnd.api+json");
      const event = JSON.parse(requests[0].options.body).data.attributes;
      assert.equal(event.metric.data.attributes.name, "Application Approved");
      assert.equal(event.profile.data.attributes.email, "teacher@school.invalid");
      assert.equal(event.profile.data.attributes.first_name, "Daniel");
      assert.equal(event.profile.data.attributes.last_name, "Teacher");
      assert.equal(event.properties.role, "TEACHER");
      assert.equal(event.properties.letter_type, "Teacher Employment Letter");
      assert.equal(event.properties.registration_number, "MIC/STF/2026/001");
      assert.equal(event.properties.department, "Science");
      assert.equal(event.properties.school_name, "Mercy T College Nursery and Primary School");
    } finally {
      global.fetch = originalFetch;
      if (originalPrivateKey === undefined) delete process.env.KLAVIYO_PRIVATE_API_KEY;
      else process.env.KLAVIYO_PRIVATE_API_KEY = originalPrivateKey;
      if (originalApiKey === undefined) delete process.env.KLAVIYO_API_KEY;
      else process.env.KLAVIYO_API_KEY = originalApiKey;
    }
  });

  await t.test("approval event reports Klaviyo API rejections", async () => {
    const originalFetch = global.fetch;
    const originalPrivateKey = process.env.KLAVIYO_PRIVATE_API_KEY;
    const originalApiKey = process.env.KLAVIYO_API_KEY;
    process.env.KLAVIYO_PRIVATE_API_KEY = "klaviyo-test-key";
    delete process.env.KLAVIYO_API_KEY;
    global.fetch = async () => ({
      status: 403,
      ok: false,
      json: async () => ({ errors: [{ detail: "Missing events:write scope" }] }),
    });

    try {
      await assert.rejects(
        klaviyoService.trackApprovalEvent({ email: "student@school.invalid", role: "STUDENT" }),
        (error) => error.code === "KLAVIYO_HTTP_403" && /events:write/.test(error.message)
      );
    } finally {
      global.fetch = originalFetch;
      if (originalPrivateKey === undefined) delete process.env.KLAVIYO_PRIVATE_API_KEY;
      else process.env.KLAVIYO_PRIVATE_API_KEY = originalPrivateKey;
      if (originalApiKey === undefined) delete process.env.KLAVIYO_API_KEY;
      else process.env.KLAVIYO_API_KEY = originalApiKey;
    }
  });
});
