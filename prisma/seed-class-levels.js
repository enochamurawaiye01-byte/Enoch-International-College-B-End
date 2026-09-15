require("dotenv").config();

const { prisma } = require("../src/config/database");

const classLevels = [
    {
        name: "JSS1",
        code: "JSS1",
        description: "Junior Secondary School 1",
    },
    {
        name: "JSS2",
        code: "JSS2",
        description: "Junior Secondary School 2",
    },
    {
        name: "JSS3",
        code: "JSS3",
        description: "Junior Secondary School 3",
    },
    {
        name: "SS1",
        code: "SS1",
        description: "Senior Secondary School 1",
    },
    {
        name: "SS2",
        code: "SS2",
        description: "Senior Secondary School 2",
    },
    {
        name: "SS3",
        code: "SS3",
        description: "Senior Secondary School 3",
    },
];

async function main() {
    console.log("Creating class levels...");

    for (const level of classLevels) {
        const result = await prisma.classLevel.upsert({
            where: {
                name: level.name,
            },

            update: {
                code: level.code,
                description: level.description,
            },

            create: level,
        });

        console.log(`✓ ${result.name}`);
    }

    console.log("Class levels are ready.");
}

main()
    .catch((error) => {
        console.error("Error creating class levels:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });