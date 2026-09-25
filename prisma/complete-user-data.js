require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const generateRegistrationNumber = require("../src/core/utils/generate-registration-number");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function completeUserData() {
  console.log("=== Enoch ERP Data Completion & Auto-Healing Script ===");
  try {
    const defaultSchool = await prisma.school.findFirst();
    const defaultClass = await prisma.class.findFirst({ where: { isActive: true } });
    
    const users = await prisma.user.findMany({
      include: {
        student: true,
        staff: true,
        parent: true,
      },
    });

    console.log(`Found ${users.length} total user accounts to inspect.`);

    let healedCount = 0;

    for (const user of users) {
      const nameParts = (user.fullName || "User Account").trim().split(/\s+/);
      const firstName = nameParts[0] || "User";
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Account";

      // 1. Ensure schoolId is assigned
      if (!user.schoolId && defaultSchool) {
        await prisma.user.update({
          where: { id: user.id },
          data: { schoolId: defaultSchool.id },
        });
      }

      // 2. Profile auto-creation based on Role
      if (user.role === "STUDENT") {
        if (!user.student) {
          const registrationNumber = await generateRegistrationNumber(prisma, user.fullName || "Student User");
          await prisma.student.create({
            data: {
              userId: user.id,
              registrationNumber,
              firstName,
              lastName,
              status: user.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
              currentClassId: defaultClass?.id || null,
              admissionDate: new Date(),
            },
          });
          console.log(`[+] Created Student profile for ${user.fullName} (${registrationNumber})`);
          healedCount++;
        }
      } else if (["TEACHER", "STAFF", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER", "BURSAR", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        if (!user.staff) {
          const staffNumber = `EIC/STF/${Math.floor(1000 + Math.random() * 9000)}`;
          await prisma.staff.create({
            data: {
              userId: user.id,
              staffNumber,
              firstName,
              lastName,
              jobTitle: user.role,
              status: user.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
              employmentDate: new Date(),
            },
          });
          console.log(`[+] Created Staff profile for ${user.fullName} (${staffNumber})`);
          healedCount++;
        }
      } else if (user.role === "PARENT") {
        if (!user.parent) {
          await prisma.parent.create({
            data: {
              userId: user.id,
              firstName,
              lastName,
            },
          });
          console.log(`[+] Created Parent profile for ${user.fullName}`);
          healedCount++;
        }
      }
    }

    console.log(`Data completion completed successfully! Healed/completed ${healedCount} user profiles.`);
  } catch (err) {
    console.error("Data completion failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

completeUserData();
