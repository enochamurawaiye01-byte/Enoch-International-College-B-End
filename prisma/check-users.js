require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                schoolId: true,
            },
        });

        console.log(users);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();