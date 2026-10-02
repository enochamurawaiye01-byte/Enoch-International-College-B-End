require("dotenv").config();

const { Client } = require("pg");

const relevantTables = [
  "Student", "Admission", "User", "Staff", "ClassLevel", "Class", "Department",
  "Subject", "ClassSubject", "Enrollment", "StudentSubjectEnrollment", "ClassTeacherAssignment",
  "AssessmentConfiguration", "AcademicSession", "Term", "ReportCard", "ReportCardEntry", "Result",
];

const run = async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the read-only production audit.");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const database = (await client.query(
      "SELECT current_database() AS database, current_schema() AS schema, current_setting('server_version') AS server_version"
    )).rows[0];
    const allTables = (await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
    )).rows.map(({ table_name }) => table_name);
    const tables = relevantTables.filter((name) => allTables.includes(name));
    const columns = (await client.query(
      "SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name, ordinal_position",
      [tables]
    )).rows;
    const constraints = (await client.query(
      "SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column FROM information_schema.table_constraints tc LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_schema = kcu.constraint_schema AND tc.constraint_name = kcu.constraint_name AND tc.table_name = kcu.table_name LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_schema = ccu.constraint_schema AND tc.constraint_name = ccu.constraint_name WHERE tc.table_schema = 'public' AND tc.table_name = ANY($1::text[]) AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE') ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position",
      [tables]
    )).rows;
    const indexes = (await client.query(
      "SELECT tablename AS table_name, indexname AS index_name, indexdef AS definition FROM pg_indexes WHERE schemaname = 'public' AND tablename = ANY($1::text[]) ORDER BY tablename, indexname",
      [tables]
    )).rows;
    const counts = {};
    for (const table of tables) {
      counts[table] = Number((await client.query(`SELECT count(*) FROM public."${table}"`)).rows[0].count);
    }
    const groupedCounts = {};
    for (const [table, column] of [["Student", "status"], ["Admission", "status"], ["User", "role"], ["Staff", "status"]]) {
      if (columns.some((item) => item.table_name === table && item.column_name === column)) {
        groupedCounts[`${table}.${column}`] = (await client.query(
          `SELECT "${column}"::text AS category, count(*)::bigint AS count FROM public."${table}" GROUP BY "${column}" ORDER BY "${column}"::text`
        )).rows.map(({ category, count }) => ({ category, count: Number(count) }));
      }
    }
    const classes = tables.includes("Class") && tables.includes("ClassLevel")
      ? (await client.query(
        "SELECT level.code AS level_code, school_class.arm, school_class.name, school_class.\"isActive\" AS active FROM public.\"Class\" school_class JOIN public.\"ClassLevel\" level ON level.id = school_class.\"classLevelId\" ORDER BY level.code, school_class.arm"
      )).rows
      : [];
    const migrationTable = allTables.includes("_prisma_migrations");
    const migrations = migrationTable
      ? (await client.query(
        "SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM public.\"_prisma_migrations\" ORDER BY started_at"
      )).rows
      : [];
    const studentColumns = new Set(columns.filter((item) => item.table_name === "Student").map((item) => item.column_name));
    const registrationAudit = tables.includes("Student") && studentColumns.has("registrationNumber")
      ? {
        duplicateGroups: Number((await client.query(
          "SELECT count(*) FROM (SELECT \"registrationNumber\" FROM public.\"Student\" WHERE \"registrationNumber\" IS NOT NULL GROUP BY \"registrationNumber\" HAVING count(*) > 1) duplicate_numbers"
        )).rows[0].count),
        nullCount: Number((await client.query(
          "SELECT count(*) FROM public.\"Student\" WHERE \"registrationNumber\" IS NULL"
        )).rows[0].count),
      }
      : null;
    const studentProfileQuality = tables.includes("Student") && tables.includes("User")
      ? (await client.query(
        "SELECT count(*)::int AS total, count(*) FILTER (WHERE student.\"registrationNumber\" IS NULL)::int AS missing_registration, count(*) FILTER (WHERE student.\"currentClassId\" IS NULL)::int AS missing_class, count(*) FILTER (WHERE student.\"currentSessionId\" IS NULL)::int AS missing_session, count(*) FILTER (WHERE account.email IS NULL OR btrim(account.email) = '')::int AS missing_email, count(*) FILTER (WHERE account.role <> 'STUDENT')::int AS non_student_role FROM public.\"Student\" student JOIN public.\"User\" account ON account.id = student.\"userId\""
      )).rows[0]
      : null;
    const studentAccountsWithoutProfile = tables.includes("Student") && tables.includes("User")
      ? Number((await client.query(
        "SELECT count(*) FROM public.\"User\" account WHERE account.role = 'STUDENT' AND NOT EXISTS (SELECT 1 FROM public.\"Student\" student WHERE student.\"userId\" = account.id)"
      )).rows[0].count)
      : null;
    const activeStudentsWithoutEnrollment = tables.includes("Student") && tables.includes("Enrollment")
      ? Number((await client.query(
        "SELECT count(*) FROM public.\"Student\" student WHERE student.status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM public.\"Enrollment\" enrollment WHERE enrollment.\"studentId\" = student.id AND enrollment.status = 'ACTIVE')"
      )).rows[0].count)
      : null;
    const studentRegistrationColumn = columns.find((item) => item.table_name === "Student" && item.column_name === "registrationNumber") || null;
    const desiredDepartmentColumn = columns.find((item) => item.table_name === "Student" && item.column_name === "desiredDepartmentId") || null;
    const migrationPreconditions = {
      enrollmentDepartmentColumn: columns.some((item) => item.table_name === "Enrollment" && item.column_name === "departmentId"),
      reportCardClassColumn: columns.some((item) => item.table_name === "ReportCard" && item.column_name === "classId"),
      reportCardEntryAuditColumns: ["teacherId", "createdById", "updatedById"].every((name) => columns.some((item) => item.table_name === "ReportCardEntry" && item.column_name === name)),
      studentSubjectEnrollmentTable: allTables.includes("StudentSubjectEnrollment"),
      classTeacherAssignmentTable: allTables.includes("ClassTeacherAssignment"),
      assessmentConfigurationTable: allTables.includes("AssessmentConfiguration"),
    };
    const backfillEstimate = tables.includes("Enrollment") && tables.includes("ClassSubject")
      ? Number((await client.query(
        "SELECT count(*) FROM \"Enrollment\" e JOIN \"Class\" c ON c.id = e.\"classId\" JOIN \"ClassLevel\" level ON level.id = c.\"classLevelId\" JOIN \"ClassSubject\" cs ON cs.\"classId\" = c.id JOIN \"Subject\" subject ON subject.id = cs.\"subjectId\" AND subject.\"isActive\" = true WHERE NOT level.code LIKE 'SS%' OR subject.\"departmentId\" IS NULL"
      )).rows[0].count)
      : null;
    const relevantConstraints = constraints.filter((item) => ["Student", "Admission", "Enrollment", "StudentSubjectEnrollment", "ReportCard", "ReportCardEntry"].includes(item.table_name));
    const relevantIndexes = indexes.filter((item) => ["Student", "Admission", "Enrollment", "StudentSubjectEnrollment", "ReportCard", "ReportCardEntry"].includes(item.table_name));
    await client.query("ROLLBACK");
    console.log(JSON.stringify({
      database,
      totalPublicTables: allTables.length,
      relevantTablesPresent: tables,
      counts,
      groupedCounts,
      classes,
      registrationAudit,
      studentProfileQuality,
      studentAccountsWithoutProfile,
      activeStudentsWithoutEnrollment,
      migrationTable,
      migrations,
      migrationPreconditions,
      estimatedStudentSubjectBackfillRows: backfillEstimate,
      studentRegistrationColumn,
      desiredDepartmentColumn,
      relevantConstraints,
      relevantIndexNames: relevantIndexes.map(({ table_name, index_name }) => ({ table_name, index_name })),
    }, null, 2));
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error(`Read-only database audit failed: ${error.code || error.name}`);
  process.exitCode = 1;
});
