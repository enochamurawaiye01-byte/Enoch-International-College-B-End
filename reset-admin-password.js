const { prisma } = require("./src/config/database");
const { hashPassword } = require("./src/core/utils/hash");

const EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim();
const NEW_PASSWORD = process.env.ADMIN_PASSWORD;

const resetPassword = async () => {
    try {
        if (!EMAIL || !NEW_PASSWORD) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.");
        const normalizedEmail = EMAIL;

        const user = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });

        if (!user) {
            console.log("User not found:", normalizedEmail);
            return;
        }

        const passwordHash = await hashPassword(NEW_PASSWORD);

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                passwordHash,
            },
        });

        console.log("=================================");
        console.log("PASSWORD RESET SUCCESSFUL");
        console.log("Email:", normalizedEmail);
        console.log("=================================");
    } catch (error) {   
        console.error("Password reset failed:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
};

resetPassword();