require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

const USER_ID = "811107e5-d29d-422a-bd04-b0b2f770657e";

const SCHOOL_ID = "00000000-0000-0000-0000-000000000001";

async function assignUserToSchool() {
    try {
        const school = await prisma.school.findUnique({
            where: {
                id: SCHOOL_ID,
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (!school) {
            throw new Error("School not found.");
        }

        const user = await prisma.user.update({
            where: {
                id: USER_ID,
            },
            data: {
                schoolId: SCHOOL_ID,
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                schoolId: true,
            },
        });

        console.log("User assigned successfully:");
        console.log(user);
    } catch (error) {
        console.error("Assignment failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

assignUserToSchool();