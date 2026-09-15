require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

async function checkStudents() {
    try {
        const students = await prisma.student.findMany({
            select: {
                id: true,
                userId: true,
                registrationNumber: true,
                firstName: true,
                middleName: true,
                lastName: true,
                status: true,
            },
        });

        console.log(students);
    } catch (error) {
        console.error("Failed to check students:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkStudents();