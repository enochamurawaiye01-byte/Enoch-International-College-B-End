const { z } = require("zod");

const isTrustedPushEndpoint = (value) => {
	try {
		const endpoint = new URL(value);
		const supportedProviders = [
			"fcm.googleapis.com",
			"android.googleapis.com",
			"push.services.mozilla.com",
			"push.apple.com",
			"notify.windows.com",
		];
		return endpoint.protocol === "https:"
			&& !endpoint.username
			&& !endpoint.password
			&& supportedProviders.some((host) => endpoint.hostname === host || endpoint.hostname.endsWith(`.${host}`));
	} catch {
		return false;
	}
};

const pushSubscriptionSchema = z.object({
	endpoint: z.string().url().max(2048).refine(isTrustedPushEndpoint, "Unsupported push notification service endpoint."),
	keys: z.object({
		p256dh: z.string().min(1).max(256),
		auth: z.string().min(1).max(256),
	}).strict(),
}).strict();

const removePushSubscriptionSchema = z.object({
	endpoint: z.string().url().max(2048).refine(isTrustedPushEndpoint, "Unsupported push notification service endpoint."),
}).strict();

module.exports = { pushSubscriptionSchema, removePushSubscriptionSchema };
