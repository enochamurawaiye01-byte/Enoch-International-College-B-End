CREATE TABLE "StudentDepartmentSelection" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDepartmentSelection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentDepartmentSelection_studentId_departmentId_key"
ON "StudentDepartmentSelection"("studentId", "departmentId");

CREATE INDEX "StudentDepartmentSelection_studentId_idx"
ON "StudentDepartmentSelection"("studentId");

CREATE INDEX "StudentDepartmentSelection_departmentId_idx"
ON "StudentDepartmentSelection"("departmentId");

ALTER TABLE "StudentDepartmentSelection"
ADD CONSTRAINT "StudentDepartmentSelection_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentDepartmentSelection"
ADD CONSTRAINT "StudentDepartmentSelection_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
