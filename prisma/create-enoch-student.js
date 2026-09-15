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

async function createStudent() {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: USER_ID,
            },
        });

        if (!user) {
            throw new Error("User not found.");
        }

        const existingStudent = await prisma.student.findUnique({
            where: {
                userId: USER_ID,
            },
        });

        if (existingStudent) {
            console.log("Student profile already exists:");
            console.log(existingStudent);
            return;
        }

        const year = new Date().getFullYear();

        const existingCount = await prisma.student.count({
            where: {
                registrationNumber: {
                    startsWith: `${year}-`,
                },
            },
        });

        const registrationNumber = `${year}-${String(
            existingCount + 1
        ).padStart(3, "0")}-EAM`;

        const student = await prisma.student.create({
            data: {
                userId: USER_ID,
                registrationNumber,
                firstName: "Enoch",
                middleName: "Oluwaseun",
                lastName: "Amurawaiye",
                admissionDate: new Date(),
                status: "ACTIVE",
            },
        });

        console.log("Student created successfully:");
        console.log(student);
    } catch (error) {
        console.error("Failed to create student:", error);
    } finally {
        await prisma.$disconnect();
    }
}

createStudent();