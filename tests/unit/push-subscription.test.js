const assert = require("node:assert/strict");
const test = require("node:test");
const { pushSubscriptionSchema } = require("../../src/modules/notifications/push.validator");

const validKeys = {
	p256dh: "browser-public-key",
	auth: "browser-auth-secret",
};

test("push subscriptions accept the browser's nullable expirationTime", () => {
	const result = pushSubscriptionSchema.safeParse({
		endpoint: "https://fcm.googleapis.com/fcm/send/test",
		expirationTime: null,
		keys: validKeys,
	});

	assert.equal(result.success, true);
});

test("push subscriptions accept a numeric expirationTime", () => {
	const result = pushSubscriptionSchema.safeParse({
		endpoint: "https://fcm.googleapis.com/fcm/send/test",
		expirationTime: 1_800_000_000_000,
		keys: validKeys,
	});

	assert.equal(result.success, true);
});

test("push subscriptions continue to reject unrecognized fields", () => {
	const result = pushSubscriptionSchema.safeParse({
		endpoint: "https://fcm.googleapis.com/fcm/send/test",
		expirationTime: null,
		keys: validKeys,
		unexpected: true,
	});

	assert.equal(result.success, false);
});
