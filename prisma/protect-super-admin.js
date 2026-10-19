require("dotenv").config();

const { prisma } = require("../src/config/database");

const email = process.env.PROTECTED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();

if (!email) {
  throw new Error("PROTECTED_SUPER_ADMIN_EMAIL is required.");
}

const protectSuperAdmin = async () => {
  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { email },
      select: { id: true, role: true, isProtectedSuperAdmin: true },
    });
    if (!target) throw new Error("The configured protected Super Admin account was not found.");
    if (target.role !== "SUPER_ADMIN") throw new Error("The configured account must have the SUPER_ADMIN role.");

    const existing = await tx.user.findFirst({
      where: { isProtectedSuperAdmin: true },
      select: { id: true },
    });
    if (existing && existing.id !== target.id) {
      throw new Error("A different protected Super Admin account is already designated.");
    }

    if (!target.isProtectedSuperAdmin) {
      await tx.user.update({
        where: { id: target.id },
        data: { isProtectedSuperAdmin: true },
      });
    }
  });

  console.log("Protected Super Admin account designated.");
};

protectSuperAdmin()
  .catch((error) => {
    console.error("Super Admin protection setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
