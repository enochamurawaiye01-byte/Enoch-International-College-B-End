ALTER TABLE "Student"
ALTER COLUMN "registrationNumber" DROP NOT NULL,
ADD COLUMN "desiredDepartmentId" TEXT;

ALTER TABLE "Admission"
ADD COLUMN "desiredDepartmentId" TEXT;

CREATE INDEX "Student_desiredDepartmentId_idx" ON "Student"("desiredDepartmentId");
CREATE INDEX "Admission_desiredDepartmentId_idx" ON "Admission"("desiredDepartmentId");

ALTER TABLE "Student"
ADD CONSTRAINT "Student_desiredDepartmentId_fkey"
FOREIGN KEY ("desiredDepartmentId") REFERENCES "Department"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Admission"
ADD CONSTRAINT "Admission_desiredDepartmentId_fkey"
FOREIGN KEY ("desiredDepartmentId") REFERENCES "Department"("id")
ON DELETE SET NULL ON UPDATE CASCADE;