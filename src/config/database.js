require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL?.replace(/^postgres:\/\//, "postgresql://");

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

const disconnectDatabase = async () => {
  await prisma.$disconnect();
};

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};