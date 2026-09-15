require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

const seed = async () => {
    console.log("Starting database seed...");

    const school = await prisma.school.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000001",
        },
        update: {},
        create: {
            id: "00000000-0000-0000-0000-000000000001",
            name: "Enoch International College",
            shortName: "EIC",
            motto: "Excellence in Education",
            country: "Nigeria",
        },
    });

    console.log("School created:", school.name);

    const departments = [
        { name: "Science", description: "Science department" },
        { name: "Commercial", description: "Commercial department" },
    ];

    for (const department of departments) {
        await prisma.department.upsert({
            where: { name: department.name },
            update: { description: department.description },
            create: department,
        });
    }

    console.log("Departments created: Science, Commercial");
};

seed()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });