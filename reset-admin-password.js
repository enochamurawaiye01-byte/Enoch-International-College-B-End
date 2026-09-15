const { prisma } = require("./src/config/database");
const { hashPassword } = require("./src/core/utils/hash");

const EMAIL = "enochamurawaiye01@gmail.com";
const NEW_PASSWORD = "ChangeMe@2026";

const resetPassword = async () => {
    try {
        const normalizedEmail = EMAIL.toLowerCase().trim();

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
        console.log("New password:", NEW_PASSWORD);
        console.log("=================================");
    } catch (error) {
        console.error("Password reset failed:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
};

resetPassword();