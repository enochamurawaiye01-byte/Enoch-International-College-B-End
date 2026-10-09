const webpush = require("web-push");
const { prisma } = require("../../config/database");
const AppError = require("../../core/errors/AppError");

let vapidConfigured = false;
let configurationWarningLogged = false;

const getVapidConfiguration = () => ({
	publicKey: process.env.VAPID_PUBLIC_KEY || "",
	privateKey: process.env.VAPID_PRIVATE_KEY || "",
	subject: process.env.VAPID_SUBJECT || "",
});

const isConfigured = () => {
	const { publicKey, privateKey, subject } = getVapidConfiguration();
	return Boolean(publicKey && privateKey && subject);
};

const getPublicKey = () => getVapidConfiguration().publicKey || null;

const notificationPathForRole = (role) => {
	const workspace = role === "PARENT" ? "parent"
		: role === "STUDENT" ? "student"
			: ["MANAGEMENT", "GOVERNING_BOARD", "PRINCIPAL", "VICE_PRINCIPAL", "VICE_PRINCIPAL_ACADEMICS", "VICE_PRINCIPAL_ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD_TEACHER"].includes(role) ? "management"
				: ["TEACHER", "STAFF", "SENIOR_TEACHER", "CLASS_TEACHER", "SUBJECT_TEACHER"].includes(role) ? "teacher" : "admin";
	return `/pages/${workspace}/notifications.html`;
};

const configureVapid = () => {
	if (!isConfigured()) {
		if (!configurationWarningLogged) {
			console.warn("[Web Push] VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT are required to send phone alerts.");
			configurationWarningLogged = true;
		}
		return false;
	}
	if (!vapidConfigured) {
		const { publicKey, privateKey, subject } = getVapidConfiguration();
		webpush.setVapidDetails(subject, publicKey, privateKey);
		vapidConfigured = true;
	}
	return true;
};

const saveSubscription = async (userId, subscription) => {
	const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: subscription.endpoint } });
	if (existing && existing.userId !== userId) {
		throw new AppError("This phone notification subscription is already linked to another account.", 409, "PUSH_SUBSCRIPTION_IN_USE");
	}
	if (existing) {
		return prisma.pushSubscription.update({
			where: { id: existing.id },
			data: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
		});
	}
	return prisma.pushSubscription.create({
		data: {
			userId,
			endpoint: subscription.endpoint,
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth,
		},
	});
};

const removeSubscription = (userId, endpoint) => prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });

const sendToUsers = async (userIds, { title, body, url }) => {
	if (!userIds.length || !configureVapid()) return;
	const subscriptions = await prisma.pushSubscription.findMany({
		where: { userId: { in: [...new Set(userIds)] } },
		select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true, user: { select: { role: true } } },
	});
	for (let index = 0; index < subscriptions.length; index += 20) {
		const batch = subscriptions.slice(index, index + 20);
		await Promise.all(batch.map(async (subscription) => {
			try {
				await webpush.sendNotification({
					endpoint: subscription.endpoint,
					keys: { p256dh: subscription.p256dh, auth: subscription.auth },
				}, JSON.stringify({ title, body, url: url || notificationPathForRole(subscription.user.role) }));
			} catch (error) {
				if (error.statusCode === 404 || error.statusCode === 410) {
					await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
					return;
				}
				console.error(`[Web Push delivery failed] subscriptionId=${subscription.id} status=${error.statusCode || "unknown"} message=${error.message}`);
			}
		}));
	}
};

module.exports = { getPublicKey, isConfigured, saveSubscription, removeSubscription, sendToUsers };
