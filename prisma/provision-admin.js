require("dotenv").config();

const { prisma } = require("../src/config/database");
const { hashPassword } = require("../src/core/utils/hash");

const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD;
const role = process.env.ADMIN_ROLE || "SUPER_ADMIN";

if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.");
}

if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    throw new Error("ADMIN_ROLE must be ADMIN or SUPER_ADMIN.");
}

const provisionAdmin = async () => {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash, role, status: "ACTIVE" },
        create: { email, fullName: process.env.ADMIN_NAME || "School Administrator", passwordHash, role, status: "ACTIVE" },
        select: { email: true, role: true, status: true },
    });

    console.log(`Admin account ready: ${user.email} (${user.role}, ${user.status}).`);
};

provisionAdmin()
    .catch((error) => {
        console.error("Admin provisioning failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());