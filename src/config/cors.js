const LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

const normalizeOrigin = (value) => {
	if (!value) return null;
	try {
		const url = new URL(value.trim());
		return `${url.protocol}//${url.host}`;
	} catch {
		return null;
	}
};

const getAllowedOrigins = () => [...new Set([
	...LOCAL_ORIGINS,
	...(process.env.FRONTEND_URL || "")
		.split(",")
		.map(normalizeOrigin)
		.filter(Boolean),
])];

const isAllowedOrigin = (origin) => {
	if (!origin || getAllowedOrigins().includes(origin)) return true;
	try {
		const { protocol, hostname } = new URL(origin);
		return protocol === "https:"
			&& (hostname === "mercy-international-college.vercel.app"
				|| /^mercy-international-college-[a-z0-9-]+\.vercel\.app$/i.test(hostname));
	} catch {
		return false;
	}
};

const corsOptions = {
	origin: (origin, callback) => {
		if (isAllowedOrigin(origin)) return callback(null, true);
		return callback(null, false);
	},
	credentials: true,
	methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	optionsSuccessStatus: 204,
};

module.exports = { corsOptions, getAllowedOrigins, normalizeOrigin, isAllowedOrigin };
