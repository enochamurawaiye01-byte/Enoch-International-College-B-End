require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { hashPassword } = require("../src/core/utils/hash");

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SCHOOL_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_PASSWORD = "DemoSchool@2026";
const sessionName = "2026/2027";

const students = [
    ["Amina", "Yusuf"], ["Chinedu", "Okafor"], ["Daniel", "Adeyemi"],
    ["Esther", "Bello"], ["Fatima", "Musa"], ["Gabriel", "Eze"],
    ["Hauwa", "Ibrahim"], ["Ifeanyi", "Nwosu"], ["Kelechi", "Obi"],
    ["Mariam", "Sani"],
];

const teachers = [
    ["Grace", "Adebayo", "Mathematics"], ["Samuel", "Okoro", "English Language"],
    ["Ruth", "Ibrahim", "Biology"], ["David", "Mensah", "Physics"],
    ["Linda", "Eze", "Computer Studies"],
];

const subjectDefinitions = [
    ["Mathematics", "MTH"], ["English Language", "ENG"], ["Biology", "BIO"],
    ["Physics", "PHY"], ["Computer Studies", "CST"], ["Chemistry", "CHM"],
];

const classDefinitions = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];
const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const times = [["08:00", "08:45"], ["08:50", "09:35"], ["09:55", "10:40"], ["10:45", "11:30"], ["11:50", "12:35"]];

async function upsertUser(email, fullName, role) {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    return prisma.user.upsert({
        where: { email },
        update: { fullName, role, status: "ACTIVE", passwordHash, schoolId: SCHOOL_ID },
        create: { email, fullName, role, status: "ACTIVE", passwordHash, schoolId: SCHOOL_ID },
    });
}

async function main() {
    const school = await prisma.school.upsert({
        where: { id: SCHOOL_ID },
        update: {},
        create: { id: SCHOOL_ID, name: "Enoch International College", shortName: "EIC", motto: "Excellence in Education", country: "Nigeria" },
    });

    const science = await prisma.department.upsert({ where: { name: "Science" }, update: {}, create: { name: "Science", description: "Science department" } });
    const commercial = await prisma.department.upsert({ where: { name: "Commercial" }, update: {}, create: { name: "Commercial", description: "Commercial department" } });

    const session = await prisma.academicSession.upsert({
        where: { schoolId_name: { schoolId: school.id, name: sessionName } },
        update: { isActive: true },
        create: { schoolId: school.id, name: sessionName, startDate: new Date("2026-09-01T00:00:00.000Z"), endDate: new Date("2027-07-31T23:59:59.000Z"), isActive: true },
    });
    await prisma.academicSession.updateMany({ where: { schoolId: school.id, id: { not: session.id } }, data: { isActive: false } });

    const term = await prisma.term.upsert({
        where: { sessionId_type: { sessionId: session.id, type: "FIRST" } },
        update: { isActive: true },
        create: { sessionId: session.id, name: "First Term", type: "FIRST", startDate: new Date("2026-09-01T00:00:00.000Z"), endDate: new Date("2026-12-18T23:59:59.000Z"), isActive: true },
    });
    await prisma.term.updateMany({ where: { sessionId: session.id, id: { not: term.id } }, data: { isActive: false } });

    const levels = {};
    for (const name of classDefinitions) {
        levels[name] = await prisma.classLevel.upsert({ where: { name }, update: {}, create: { name, code: name, description: `${name} class level` } });
    }

    const classes = {};
    for (const name of classDefinitions) {
        classes[name] = await prisma.class.upsert({
            where: { classLevelId_arm: { classLevelId: levels[name].id, arm: "A" } },
            update: { name: `${name} A`, isActive: true },
            create: { classLevelId: levels[name].id, name: `${name} A`, arm: "A", isActive: true },
        });
    }

    const subjects = {};
    for (const [name, code] of subjectDefinitions) {
        subjects[name] = await prisma.subject.upsert({
            where: { code: `DEMO-${code}` },
            update: { name, isActive: true },
            create: { name, code: `DEMO-${code}`, departmentId: ["Biology", "Physics", "Chemistry"].includes(name) ? science.id : commercial.id, isCompulsory: true, isActive: true },
        });
    }

    for (const schoolClass of Object.values(classes)) {
        for (const subject of Object.values(subjects)) {
            await prisma.classSubject.upsert({ where: { classId_subjectId: { classId: schoolClass.id, subjectId: subject.id } }, update: {}, create: { classId: schoolClass.id, subjectId: subject.id } });
        }
    }

    const teacherRecords = [];
    for (let index = 0; index < teachers.length; index += 1) {
        const [firstName, lastName, subjectName] = teachers[index];
        const email = `teacher${index + 1}@enochcollege.test`;
        const user = await upsertUser(email, `${firstName} ${lastName}`, "TEACHER");
        const staff = await prisma.staff.upsert({
            where: { userId: user.id },
            update: { firstName, lastName, staffNumber: `EIC-T-${String(index + 1).padStart(3, "0")}`, jobTitle: "Teacher", status: "ACTIVE", departmentId: science.id, employmentType: "FULL_TIME" },
            create: { userId: user.id, firstName, lastName, staffNumber: `EIC-T-${String(index + 1).padStart(3, "0")}`, jobTitle: "Teacher", status: "ACTIVE", departmentId: science.id, employmentType: "FULL_TIME", employmentDate: new Date("2026-09-01T00:00:00.000Z") },
        });
        teacherRecords.push({ staff, subject: subjects[subjectName] });
    }

    for (let index = 0; index < students.length; index += 1) {
        const [firstName, lastName] = students[index];
        const email = `student${index + 1}@enochcollege.test`;
        const user = await upsertUser(email, `${firstName} ${lastName}`, "STUDENT");
        const className = classDefinitions[index % classDefinitions.length];
        const student = await prisma.student.upsert({
            where: { userId: user.id },
            update: { firstName, lastName, currentClassId: classes[className].id, status: "ACTIVE" },
            create: { userId: user.id, firstName, lastName, registrationNumber: `EIC-DEMO-${String(index + 1).padStart(3, "0")}`, currentClassId: classes[className].id, currentSessionId: session.id, admissionDate: new Date("2026-09-01T00:00:00.000Z"), status: "ACTIVE" },
        });
        await prisma.enrollment.upsert({ where: { studentId_sessionId_termId: { studentId: student.id, sessionId: session.id, termId: term.id } }, update: { classId: classes[className].id, status: "ACTIVE" }, create: { studentId: student.id, sessionId: session.id, termId: term.id, classId: classes[className].id, status: "ACTIVE" } });
    }

    for (let index = 0; index < teacherRecords.length; index += 1) {
        const teacher = teacherRecords[index];
        const schoolClass = classes[classDefinitions[index]];
        const existing = await prisma.teacherAssignment.findFirst({ where: { staffId: teacher.staff.id, subjectId: teacher.subject.id, classId: schoolClass.id, sessionId: session.id, termId: term.id } });
        if (!existing) await prisma.teacherAssignment.create({ data: { staffId: teacher.staff.id, subjectId: teacher.subject.id, classId: schoolClass.id, sessionId: session.id, termId: term.id } });
    }

    for (const [classIndex, className] of classDefinitions.entries()) {
        const schoolClass = classes[className];
        const timetable = await prisma.timetable.upsert({ where: { sessionId_termId_classId: { sessionId: session.id, termId: term.id, classId: schoolClass.id } }, update: { name: `${className} A First Term Timetable` }, create: { sessionId: session.id, termId: term.id, classId: schoolClass.id, name: `${className} A First Term Timetable` } });
        for (let slotIndex = 0; slotIndex < times.length; slotIndex += 1) {
            const subject = subjects[subjectDefinitions[(slotIndex + classIndex) % subjectDefinitions.length][0]];
            const teacher = teacherRecords[(slotIndex + classIndex) % teacherRecords.length];
            const day = days[slotIndex];
            const existing = await prisma.timetableSlot.findFirst({ where: { timetableId: timetable.id, day, startTime: times[slotIndex][0] } });
            if (!existing) await prisma.timetableSlot.create({ data: { timetableId: timetable.id, subjectId: subject.id, staffId: teacher.staff.id, day, startTime: times[slotIndex][0], endTime: times[slotIndex][1], room: `Room ${classIndex + 1}` } });
        }
    }

    console.log(`Demo school ready: ${students.length} students, ${teachers.length} teachers, ${classDefinitions.length} classes, active session ${session.name}.`);
    console.log(`Demo password for generated accounts: ${DEMO_PASSWORD}`);
}

main().catch((error) => { console.error("Demo seed failed:", error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
