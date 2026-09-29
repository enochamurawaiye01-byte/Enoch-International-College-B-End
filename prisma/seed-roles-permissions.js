require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const ALL_56_MODULES = [
  "admissions", "academic_sessions", "analytics", "announcements", "assignments",
  "attendance", "audit_logs", "auth", "class_subjects", "classes", "dashboards",
  "departments", "discipline", "documents", "enrollments", "events", "exam_attempts",
  "examinations", "fees", "gallery", "hostel", "inventory", "invoices", "jobs",
  "klaviyo", "lessons", "library", "management", "medical", "messaging", "news",
  "notifications", "parents", "payments", "permissions", "prefects", "promotions",
  "question_bank", "receipts", "report_cards", "reports", "results", "roles",
  "settings", "staff", "students", "subjects", "teacher_assignments", "teacher_attendance",
  "teachers", "terms", "timetable", "transcripts", "transport", "users", "website"
];

const PREDEFINED_ROLES = [
  { name: "SUPER_ADMIN", label: "Super Admin", description: "Full system administration access to all 56 modules", isSystem: true, modules: ALL_56_MODULES },
  { name: "ADMIN", label: "School Admin", description: "Primary administrative authority for school operations", isSystem: true, modules: ALL_56_MODULES.filter(m => m !== "jobs") },
  { name: "PRINCIPAL", label: "Principal", description: "Executive oversight of academic and administrative school operations", isSystem: false, modules: ["dashboards", "management", "analytics", "reports", "staff", "teachers", "students", "parents", "classes", "academic_sessions", "terms", "report_cards", "discipline", "announcements", "events", "news"] },
  { name: "VICE_PRINCIPAL", label: "Vice Principal", description: "Senior administrative officer assisting principal operations", isSystem: false, modules: ["dashboards", "management", "classes", "subjects", "teacher_assignments", "lessons", "timetable", "examinations", "results", "report_cards", "transcripts", "discipline", "events", "announcements"] },
  { name: "VICE_PRINCIPAL_ACADEMICS", label: "VP (Academics)", description: "Academic curriculum, examination, and teacher assignment oversight", isSystem: false, modules: ["dashboards", "classes", "subjects", "teacher_assignments", "lessons", "timetable", "examinations", "results", "report_cards", "transcripts", "academic_sessions"] },
  { name: "VICE_PRINCIPAL_ADMIN", label: "VP (Administration)", description: "Staff attendance, facilities, transport, and operational welfare oversight", isSystem: false, modules: ["dashboards", "staff", "teacher_attendance", "discipline", "events", "transport", "hostel", "announcements", "documents"] },
  { name: "HEAD_TEACHER", label: "Head Teacher", description: "Head of teaching faculty and daily academic supervision", isSystem: false, modules: ["dashboards", "teacher_attendance", "attendance", "classes", "students", "teachers", "report_cards", "lessons", "timetable", "announcements"] },
  { name: "DEPUTY_HEAD_TEACHER", label: "Deputy Head Teacher", description: "Deputy supervisor for class schedules, attendance, and student performance", isSystem: false, modules: ["dashboards", "attendance", "classes", "students", "teachers", "report_cards", "lessons", "timetable"] },
  { name: "SCHOOL_ADMINISTRATOR", label: "School Administrator", description: "General school records and operational workspace manager", isSystem: false, modules: ["dashboards", "users", "students", "staff", "parents", "academic_sessions", "terms", "announcements", "reports"] },
  { name: "ADMIN_MANAGER", label: "Admin Manager", description: "Administrative staff and operational logistics coordinator", isSystem: false, modules: ["dashboards", "staff", "teacher_attendance", "events", "announcements", "reports", "documents"] },
  { name: "HR_MANAGER", label: "HR Manager", description: "Human resources, staff recruitment, leave, and employment records", isSystem: false, modules: ["dashboards", "staff", "teacher_attendance", "reports", "documents", "announcements", "users"] },
  { name: "ACCOUNTANT", label: "Accountant", description: "Bookkeeping, tuition fee collection, invoices, and transaction logs", isSystem: false, modules: ["dashboards", "invoices", "payments", "receipts", "fees", "reports", "analytics"] },
  { name: "BURSAR", label: "Bursar", description: "Chief bursary officer for fee structures, financial accounts, and store inventories", isSystem: false, modules: ["dashboards", "fees", "invoices", "payments", "receipts", "reports", "inventory", "analytics"] },
  { name: "FINANCE_OFFICER", label: "Finance Officer", description: "Financial reconciliation, payment verification, and fee billing", isSystem: false, modules: ["dashboards", "fees", "invoices", "payments", "receipts", "reports"] },
  { name: "PROCUREMENT_OFFICER", label: "Procurement Officer", description: "School equipment purchasing, vendor orders, and stock acquisition", isSystem: false, modules: ["dashboards", "inventory", "fees", "reports"] },
  { name: "STOREKEEPER", label: "Storekeeper", description: "Inventory stock movements, textbook distribution, and uniform management", isSystem: false, modules: ["dashboards", "inventory", "reports"] },
  { name: "REGISTRAR", label: "Registrar", description: "Official student enrollment registers, promotions, and academic transcripts", isSystem: false, modules: ["dashboards", "students", "admissions", "enrollments", "promotions", "transcripts", "documents", "parents"] },
  { name: "ADMISSIONS_OFFICER", label: "Admissions Officer", description: "Student admission applications, review, and onboarding conversion", isSystem: false, modules: ["dashboards", "admissions", "students", "parents", "enrollments", "documents"] },
  { name: "EXAMINATION_OFFICER", label: "Examination Officer", description: "CBT question bank, exam schedules, grading broadsheets, and transcripts", isSystem: false, modules: ["dashboards", "question_bank", "examinations", "exam_attempts", "results", "transcripts", "report_cards"] },
  { name: "DEAN_OF_STUDENTS", label: "Dean of Students", description: "Student welfare, prefect leadership, hostel affairs, and conduct", isSystem: false, modules: ["dashboards", "discipline", "hostel", "prefects", "events", "students"] },
  { name: "ACADEMIC_COORDINATOR", label: "Academic Coordinator", description: "Curriculum alignment, subject allocations, and lesson plan reviews", isSystem: false, modules: ["dashboards", "subjects", "classes", "class_subjects", "lessons", "timetable", "examinations"] },
  { name: "HEAD_OF_DEPARTMENT", label: "Head of Department (HOD)", description: "Departmental subject allocation, teacher performance, and schemes of work", isSystem: false, modules: ["dashboards", "departments", "subjects", "class_subjects", "teacher_assignments", "lessons", "teachers"] },
  { name: "SUBJECT_COORDINATOR", label: "Subject Coordinator", description: "Subject curriculum, continuous assessment tests, and question banks", isSystem: false, modules: ["dashboards", "subjects", "assignments", "question_bank", "examinations", "lessons"] },
  { name: "SENIOR_TEACHER", label: "Senior Teacher", description: "Senior teaching faculty for class instruction and exam grading", isSystem: false, modules: ["dashboards", "classes", "students", "attendance", "assignments", "examinations", "results", "lessons"] },
  { name: "CLASS_TEACHER", label: "Class Form Teacher", description: "Form master responsible for class attendance and terminal report cards", isSystem: false, modules: ["dashboards", "classes", "students", "attendance", "report_cards", "timetable", "assignments"] },
  { name: "SUBJECT_TEACHER", label: "Subject Specialist Teacher", description: "Subject instruction, homework creation, CBT exam questions, and grading", isSystem: false, modules: ["dashboards", "subjects", "assignments", "question_bank", "examinations", "results", "lessons"] },
  { name: "TEACHER", label: "General Teacher", description: "Class instruction, daily attendance, assignment scoring, and timetables", isSystem: false, modules: ["dashboards", "classes", "students", "attendance", "assignments", "examinations", "results", "timetable", "lessons"] },
  { name: "SCHOOL_COUNSELOR", label: "School Counselor", description: "Student guidance, behavioral notes, and parent consultation", isSystem: false, modules: ["dashboards", "students", "discipline", "parents", "messaging"] },
  { name: "LIBRARIAN", label: "Librarian", description: "Library cataloging, book borrowing loans, and digital documents", isSystem: false, modules: ["dashboards", "library", "documents", "announcements"] },
  { name: "ICT_ADMINISTRATOR", label: "ICT Administrator", description: "Portal technical settings, user accounts, roles, and audit trail logs", isSystem: false, modules: ["dashboards", "users", "permissions", "roles", "audit_logs", "settings"] },
  { name: "TRANSPORT_MANAGER", label: "Transport Manager", description: "Bus routes, driver assignments, and student transport logistics", isSystem: false, modules: ["dashboards", "transport", "students", "events"] },
  { name: "DRIVER", label: "Driver", description: "School bus route assignments and daily pickup schedules", isSystem: false, modules: ["dashboards", "transport"] },
  { name: "HEALTH_OFFICER", label: "Health / Nurse Officer", description: "Infirmary visits, medical records, blood group, and emergency alerts", isSystem: false, modules: ["dashboards", "medical", "students", "notifications"] },
  { name: "HOSTEL_WARDEN", label: "Hostel Warden", description: "Boarding dormitory allocation, room supervision, and student welfare", isSystem: false, modules: ["dashboards", "hostel", "students", "discipline"] },
  { name: "RECEPTIONIST", label: "Receptionist", description: "Front desk visitor inquiries, parent communication, and admissions info", isSystem: false, modules: ["dashboards", "admissions", "students", "parents", "announcements", "messaging"] },
  { name: "DATA_ENTRY_OFFICER", label: "Data Entry Officer", description: "Data entry operator for student records, scores, and attendance logs", isSystem: false, modules: ["dashboards", "students", "attendance", "results", "assignments"] },
  { name: "MANAGEMENT", label: "Executive Management", description: "Board level executive reporting, analytics, and operational metrics", isSystem: false, modules: ["dashboards", "analytics", "reports", "management", "students", "staff"] },
  { name: "GOVERNING_BOARD", label: "Governing Board", description: "Board of governors high-level financial and performance reports", isSystem: false, modules: ["dashboards", "analytics", "reports", "management"] },
  { name: "SECURITY_CHIEF", label: "Chief Security Officer", description: "School perimeter security, incident logs, and event security", isSystem: false, modules: ["dashboards", "discipline", "events", "announcements"] },
  { name: "LAB_ATTENDANT", label: "Science & ICT Lab Officer", description: "Laboratory equipment inventory and practical exam setup", isSystem: false, modules: ["dashboards", "inventory", "exam_attempts", "settings"] },
  { name: "INVENTORY_OFFICER", label: "Inventory Officer", description: "School store inventory and stock audit tracking", isSystem: false, modules: ["dashboards", "inventory", "reports"] },
  { name: "STAFF", label: "General Staff", description: "Basic staff member access for school announcements and internal messaging", isSystem: false, modules: ["dashboards", "announcements", "events", "documents", "messaging", "notifications"] },
  { name: "STUDENT", label: "Enrolled Student", description: "Student workspace for assignments, CBT exams, report cards, and timetables", isSystem: false, modules: ["dashboards", "assignments", "examinations", "exam_attempts", "report_cards", "attendance", "timetable", "messaging"] },
  { name: "PARENT", label: "Parent / Guardian", description: "Parent portal for ward academic performance, report cards, and fee invoices", isSystem: false, modules: ["dashboards", "parents", "students", "report_cards", "invoices", "payments", "receipts", "messaging"] }
];

async function seedRolesAndPermissions() {
  console.log("Seeding 56 Modules, 30+ Roles, and Permissions Matrix...");

  // 1. Seed Permissions for all 56 modules
  const actions = ["manage", "view", "create", "edit", "delete", "approve", "export"];
  for (const moduleKey of ALL_56_MODULES) {
    for (const act of actions) {
      const permKey = `${moduleKey}:${act}`;
      await prisma.permission.upsert({
        where: { key: permKey },
        update: { module: moduleKey, action: act, isActive: true },
        create: {
          key: permKey,
          module: moduleKey,
          action: act,
          description: `${act.toUpperCase()} permission for ${moduleKey} module`,
          isActive: true
        }
      });
    }
  }
  console.log("✓ Created Permissions for 56 ERP Modules");

  // 2. Seed Predefined Roles & RolePermissions
  for (const roleDef of PREDEFINED_ROLES) {
    const roleObj = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description, isSystem: roleDef.isSystem, isActive: true },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        isActive: true
      }
    });

    // Delete old role permissions and re-link
    await prisma.rolePermission.deleteMany({ where: { roleId: roleObj.id } });

    const rolePermsData = [];
    for (const modKey of roleDef.modules) {
      const perms = await prisma.permission.findMany({ where: { module: modKey } });
      for (const p of perms) {
        rolePermsData.push({ roleId: roleObj.id, permissionId: p.id });
      }
    }

    if (rolePermsData.length > 0) {
      await prisma.rolePermission.createMany({
        data: rolePermsData,
        skipDuplicates: true
      });
    }
  }

  console.log(`✓ Seeded ${PREDEFINED_ROLES.length} Roles & Linked Role Permissions Matrix!`);
}

seedRolesAndPermissions()
  .catch((err) => {
    console.error("Failed to seed roles & permissions:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
