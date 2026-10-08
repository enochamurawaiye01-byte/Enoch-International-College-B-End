ALTER TABLE "User"
ADD COLUMN "hasCompletedFirstLogin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "School"
ADD COLUMN "registrationPrefix" TEXT NOT NULL DEFAULT 'MIC';

UPDATE "School"
SET
  "name" = 'Mercy T International College',
  "shortName" = 'MIC',
  "registrationPrefix" = 'MIC'
WHERE lower("name") IN (
  'enoch international college',
  'enoch int college',
  'enoch international'
) OR upper(COALESCE("shortName", '')) = 'EIC';

CREATE TABLE "RegistrationNumberCounter" (
  "scope" TEXT NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistrationNumberCounter_pkey" PRIMARY KEY ("scope")
);

DO $$
DECLARE
  student_row RECORD;
  registration_number TEXT;
  counter_scope TEXT;
  next_value INTEGER;
BEGIN
  FOR student_row IN
    SELECT
      student."id",
      student."admissionDate",
      student."createdAt",
      COALESCE(NULLIF(school."registrationPrefix", ''), 'MIC') AS "registrationPrefix"
    FROM "Student" AS student
    JOIN "User" AS account ON account."id" = student."userId"
    LEFT JOIN "School" AS school ON school."id" = account."schoolId"
    WHERE student."registrationNumber" IS NULL
      AND student."status" = 'ACTIVE'
    ORDER BY COALESCE(student."admissionDate", student."createdAt"), student."id"
    FOR UPDATE OF student
  LOOP
    counter_scope := student_row."registrationPrefix" || '/' ||
      EXTRACT(YEAR FROM COALESCE(student_row."admissionDate", student_row."createdAt"))::INTEGER;
    LOOP
      INSERT INTO "RegistrationNumberCounter" ("scope", "value", "updatedAt")
      VALUES (counter_scope, 1, NOW())
      ON CONFLICT ("scope") DO UPDATE
      SET "value" = "RegistrationNumberCounter"."value" + 1, "updatedAt" = NOW()
      RETURNING "value" INTO next_value;

      registration_number := format(
        '%s/%s/%s',
        student_row."registrationPrefix",
        EXTRACT(YEAR FROM COALESCE(student_row."admissionDate", student_row."createdAt"))::INTEGER,
        LPAD(next_value::TEXT, 6, '0')
      );
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM "Student" WHERE "registrationNumber" = registration_number
      );
    END LOOP;

    UPDATE "Student"
    SET "registrationNumber" = registration_number
    WHERE "id" = student_row."id";
  END LOOP;
END $$;
