CREATE TABLE "SubjectTarget" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classLevelId" TEXT NOT NULL,
    "departmentId" TEXT,
    CONSTRAINT "SubjectTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubjectTarget_subjectId_classLevelId_departmentId_key"
ON "SubjectTarget"("subjectId", "classLevelId", "departmentId");

CREATE INDEX "SubjectTarget_classLevelId_departmentId_idx"
ON "SubjectTarget"("classLevelId", "departmentId");

CREATE INDEX "SubjectTarget_subjectId_idx"
ON "SubjectTarget"("subjectId");

ALTER TABLE "SubjectTarget"
ADD CONSTRAINT "SubjectTarget_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubjectTarget"
ADD CONSTRAINT "SubjectTarget_classLevelId_fkey"
FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubjectTarget"
ADD CONSTRAINT "SubjectTarget_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Department" ("id", "name", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Arts', 'Arts department', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
