ALTER TABLE "Enrollment"
ADD COLUMN "departmentId" TEXT;

CREATE INDEX "Enrollment_departmentId_idx" ON "Enrollment"("departmentId");

ALTER TABLE "Enrollment"
ADD CONSTRAINT "Enrollment_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StudentSubjectEnrollment" (
  "id" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "classSubjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentSubjectEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentSubjectEnrollment_enrollmentId_classSubjectId_key"
ON "StudentSubjectEnrollment"("enrollmentId", "classSubjectId");
CREATE INDEX "StudentSubjectEnrollment_enrollmentId_idx"
ON "StudentSubjectEnrollment"("enrollmentId");
CREATE INDEX "StudentSubjectEnrollment_classSubjectId_idx"
ON "StudentSubjectEnrollment"("classSubjectId");

ALTER TABLE "StudentSubjectEnrollment"
ADD CONSTRAINT "StudentSubjectEnrollment_enrollmentId_fkey"
FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentSubjectEnrollment"
ADD CONSTRAINT "StudentSubjectEnrollment_classSubjectId_fkey"
FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "StudentSubjectEnrollment" ("id", "enrollmentId", "classSubjectId", "updatedAt")
SELECT gen_random_uuid()::text, e."id", cs."id", CURRENT_TIMESTAMP
FROM "Enrollment" e
JOIN "Class" c ON c."id" = e."classId"
JOIN "ClassLevel" level ON level."id" = c."classLevelId"
JOIN "ClassSubject" cs ON cs."classId" = c."id"
JOIN "Subject" subject ON subject."id" = cs."subjectId" AND subject."isActive" = true
WHERE NOT level."code" LIKE 'SS%'
  OR subject."departmentId" IS NULL
  OR subject."departmentId" = e."departmentId"
ON CONFLICT ("enrollmentId", "classSubjectId") DO NOTHING;

CREATE TABLE "ClassTeacherAssignment" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "assignedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassTeacherAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassTeacherAssignment_classId_sessionId_key"
ON "ClassTeacherAssignment"("classId", "sessionId");
CREATE INDEX "ClassTeacherAssignment_staffId_idx"
ON "ClassTeacherAssignment"("staffId");
CREATE INDEX "ClassTeacherAssignment_sessionId_idx"
ON "ClassTeacherAssignment"("sessionId");

ALTER TABLE "ClassTeacherAssignment"
ADD CONSTRAINT "ClassTeacherAssignment_staffId_fkey"
FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassTeacherAssignment"
ADD CONSTRAINT "ClassTeacherAssignment_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassTeacherAssignment"
ADD CONSTRAINT "ClassTeacherAssignment_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassTeacherAssignment"
ADD CONSTRAINT "ClassTeacherAssignment_assignedById_fkey"
FOREIGN KEY ("assignedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportCard"
ADD COLUMN "classId" TEXT;
CREATE INDEX "ReportCard_classId_idx" ON "ReportCard"("classId");
ALTER TABLE "ReportCard"
ADD CONSTRAINT "ReportCard_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportCardEntry"
ADD COLUMN "teacherId" TEXT,
ADD COLUMN "createdById" TEXT,
ADD COLUMN "updatedById" TEXT,
ADD COLUMN "remark" TEXT;

CREATE INDEX "ReportCardEntry_teacherId_idx" ON "ReportCardEntry"("teacherId");
CREATE INDEX "ReportCardEntry_createdById_idx" ON "ReportCardEntry"("createdById");
CREATE INDEX "ReportCardEntry_updatedById_idx" ON "ReportCardEntry"("updatedById");

ALTER TABLE "ReportCardEntry"
ADD CONSTRAINT "ReportCardEntry_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Staff"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportCardEntry"
ADD CONSTRAINT "ReportCardEntry_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportCardEntry"
ADD CONSTRAINT "ReportCardEntry_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AssessmentConfiguration" (
  "id" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "schoolId" TEXT,
  "firstTestMax" DECIMAL(6,2) NOT NULL DEFAULT 20,
  "secondTestMax" DECIMAL(6,2) NOT NULL DEFAULT 20,
  "examMax" DECIMAL(6,2) NOT NULL DEFAULT 60,
  "gradeBands" JSONB NOT NULL DEFAULT '[{"minimum":70,"grade":"A","remark":"Excellent"},{"minimum":60,"grade":"B","remark":"Very Good"},{"minimum":50,"grade":"C","remark":"Good"},{"minimum":45,"grade":"D","remark":"Pass"},{"minimum":0,"grade":"F","remark":"Needs Improvement"}]'::jsonb,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentConfiguration_scopeKey_key"
ON "AssessmentConfiguration"("scopeKey");
CREATE INDEX "AssessmentConfiguration_schoolId_idx"
ON "AssessmentConfiguration"("schoolId");

ALTER TABLE "AssessmentConfiguration"
ADD CONSTRAINT "AssessmentConfiguration_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentConfiguration"
ADD CONSTRAINT "AssessmentConfiguration_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;