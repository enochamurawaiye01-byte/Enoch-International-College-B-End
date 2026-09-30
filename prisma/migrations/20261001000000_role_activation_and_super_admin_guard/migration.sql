DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleAssignmentStatus') THEN
    CREATE TYPE "RoleAssignmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'REMOVED');
  END IF;
END $$;

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DEPUTY_HEAD_TEACHER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SCHOOL_ADMINISTRATOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN_MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'HR_MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FINANCE_OFFICER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PROCUREMENT_OFFICER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STOREKEEPER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'REGISTRAR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMISSIONS_OFFICER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EXAMINATION_OFFICER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ACADEMIC_COORDINATOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUBJECT_COORDINATOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SCHOOL_COUNSELOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ICT_ADMINISTRATOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DRIVER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RECEPTIONIST';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DATA_ENTRY_OFFICER';

ALTER TABLE "UserRoleAssignment"
  ADD COLUMN IF NOT EXISTS "id" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "RoleAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "assignedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "activatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "activationToken" TEXT,
  ADD COLUMN IF NOT EXISTS "activationExpiresAt" TIMESTAMP(3);

UPDATE "UserRoleAssignment"
SET "id" = gen_random_uuid()::text
WHERE "id" IS NULL;

ALTER TABLE "UserRoleAssignment" ALTER COLUMN "id" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UserRoleAssignment_id_key"
  ON "UserRoleAssignment"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "UserRoleAssignment_activationToken_key"
  ON "UserRoleAssignment"("activationToken");

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "roleAssignmentId" TEXT;

CREATE INDEX IF NOT EXISTS "UserRoleAssignment_activationExpiresAt_idx"
  ON "UserRoleAssignment"("activationExpiresAt");

CREATE INDEX IF NOT EXISTS "Notification_roleAssignmentId_idx"
  ON "Notification"("roleAssignmentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_roleAssignmentId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_roleAssignmentId_fkey"
      FOREIGN KEY ("roleAssignmentId")
      REFERENCES "UserRoleAssignment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "UserRoleAssignment"
SET "activationExpiresAt" = "assignedAt" + INTERVAL '72 hours'
WHERE "status" = 'PENDING'
  AND "activationExpiresAt" IS NULL;

INSERT INTO "UserRoleAssignment" ("id", "userId", "roleId", "status", "assignedAt")
SELECT gen_random_uuid(), u."id", role."id", 'ACTIVE', CURRENT_TIMESTAMP
FROM "User" u
JOIN "Role" role ON role."name" = u."role"::text AND role."isActive" = TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM "UserRoleAssignment" assignment
  WHERE assignment."userId" = u."id" AND assignment."roleId" = role."id"
)
ON CONFLICT ("userId", "roleId") DO NOTHING;

CREATE OR REPLACE FUNCTION enforce_super_admin_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  candidate_user_id TEXT;
  candidate_already_counted BOOLEAN := FALSE;
  candidate_role_is_active BOOLEAN := FALSE;
  other_super_admin_count BIGINT := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(7432196081);

  IF TG_TABLE_NAME = 'User' THEN
    IF NEW."status" <> 'ACTIVE' OR NEW."role" <> 'SUPER_ADMIN' THEN
      RETURN NEW;
    END IF;

    candidate_user_id := NEW."id";
    IF TG_OP = 'UPDATE'
      AND OLD."status" = 'ACTIVE'
      AND OLD."role" = 'SUPER_ADMIN' THEN
      RETURN NEW;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM "UserRoleAssignment" assignment
      JOIN "Role" role ON role."id" = assignment."roleId"
      WHERE assignment."userId" = candidate_user_id
        AND assignment."status" IN ('ACTIVE', 'PENDING')
        AND role."name" = 'SUPER_ADMIN'
        AND role."isActive" = TRUE
    ) INTO candidate_already_counted;
  ELSE
    IF TG_OP = 'UPDATE'
      AND OLD."status" IN ('ACTIVE', 'PENDING')
      AND OLD."userId" = NEW."userId"
      AND OLD."roleId" = NEW."roleId" THEN
      RETURN NEW;
    END IF;

    IF NEW."status" NOT IN ('ACTIVE', 'PENDING') THEN
      RETURN NEW;
    END IF;

    candidate_user_id := NEW."userId";
    SELECT role."isActive" INTO candidate_role_is_active
    FROM "Role" role
    WHERE role."id" = NEW."roleId" AND role."name" = 'SUPER_ADMIN';

    IF COALESCE(candidate_role_is_active, FALSE) = FALSE THEN
      RETURN NEW;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."id" = candidate_user_id
        AND u."status" = 'ACTIVE'
        AND u."role" = 'SUPER_ADMIN'
    ) OR EXISTS (
      SELECT 1
      FROM "UserRoleAssignment" assignment
      JOIN "Role" role ON role."id" = assignment."roleId"
      WHERE assignment."userId" = candidate_user_id
        AND assignment."id" <> NEW."id"
        AND assignment."status" IN ('ACTIVE', 'PENDING')
        AND role."name" = 'SUPER_ADMIN'
        AND role."isActive" = TRUE
    ) INTO candidate_already_counted;
  END IF;

  IF candidate_already_counted THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT u."id") INTO other_super_admin_count
  FROM "User" u
  WHERE u."id" <> candidate_user_id
    AND u."status" = 'ACTIVE'
    AND (
      u."role" = 'SUPER_ADMIN'
      OR EXISTS (
        SELECT 1
        FROM "UserRoleAssignment" assignment
        JOIN "Role" role ON role."id" = assignment."roleId"
        WHERE assignment."userId" = u."id"
          AND assignment."status" IN ('ACTIVE', 'PENDING')
          AND role."name" = 'SUPER_ADMIN'
          AND role."isActive" = TRUE
      )
    );

  IF other_super_admin_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 Super Admin accounts reached'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_super_admin_limit ON "User";
CREATE TRIGGER user_super_admin_limit
BEFORE INSERT OR UPDATE OF "role", "status" ON "User"
FOR EACH ROW EXECUTE FUNCTION enforce_super_admin_limit();

DROP TRIGGER IF EXISTS user_role_assignment_super_admin_limit ON "UserRoleAssignment";
CREATE TRIGGER user_role_assignment_super_admin_limit
BEFORE INSERT OR UPDATE OF "roleId", "userId", "status" ON "UserRoleAssignment"
FOR EACH ROW EXECUTE FUNCTION enforce_super_admin_limit();