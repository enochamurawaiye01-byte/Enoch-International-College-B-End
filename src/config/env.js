require("dotenv").config();

const required = ["DATABASE_URL", "JWT_SECRET"];
const validateEnvironment = () => {
	const missing = required.filter((key) => !process.env[key]);
	if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
	const storageConfigured = Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
	if (process.env.NODE_ENV === "production" && !storageConfigured) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production for persistent file storage.");
	if (Boolean(process.env.SUPABASE_URL) !== Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured together.");
	if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters in production.");
};

module.exports = { validateEnvironment };
