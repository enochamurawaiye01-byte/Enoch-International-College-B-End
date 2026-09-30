CREATE OR REPLACE FUNCTION enforce_super_admin_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  candidate_user_id TEXT;
  candidate_already_counted BOOLEAN := FALSE;
  candidate_role_is_active BOOLEAN := FALSE;
  candidate_is_super_admin BOOLEAN := FALSE;
  other_super_admin_count BIGINT := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(7432196081);

  IF TG_TABLE_NAME = 'User' THEN
    IF NEW."status" <> 'ACTIVE' THEN
      RETURN NEW;
    END IF;

    candidate_user_id := NEW."id";
    IF TG_OP = 'UPDATE' AND OLD."status" = 'ACTIVE' THEN
      IF OLD."role" = 'SUPER_ADMIN' THEN
        RETURN NEW;
      END IF;
      IF EXISTS (
        SELECT 1
        FROM "UserRoleAssignment" assignment
        JOIN "Role" role ON role."id" = assignment."roleId"
        WHERE assignment."userId" = OLD."id"
          AND role."name" = 'SUPER_ADMIN'
          AND role."isActive" = TRUE
          AND (assignment."status" = 'ACTIVE'
            OR (assignment."status" = 'PENDING' AND assignment."activationExpiresAt" > CURRENT_TIMESTAMP))
      ) THEN
        RETURN NEW;
      END IF;
    END IF;

    SELECT NEW."role" = 'SUPER_ADMIN' OR EXISTS (
      SELECT 1
      FROM "UserRoleAssignment" assignment
      JOIN "Role" role ON role."id" = assignment."roleId"
      WHERE assignment."userId" = candidate_user_id
        AND role."name" = 'SUPER_ADMIN'
        AND role."isActive" = TRUE
        AND (assignment."status" = 'ACTIVE'
          OR (assignment."status" = 'PENDING' AND assignment."activationExpiresAt" > CURRENT_TIMESTAMP))
    ) INTO candidate_is_super_admin;

    IF NOT candidate_is_super_admin THEN
      RETURN NEW;
    END IF;
  ELSE
    IF TG_OP = 'UPDATE'
      AND OLD."userId" = NEW."userId"
      AND OLD."roleId" = NEW."roleId"
      AND (OLD."status" = 'ACTIVE'
        OR (OLD."status" = 'PENDING' AND OLD."activationExpiresAt" > CURRENT_TIMESTAMP)) THEN
      RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
      AND OLD."status" = 'PENDING'
      AND NEW."status" = 'ACTIVE'
      AND (OLD."activationExpiresAt" IS NULL OR OLD."activationExpiresAt" <= CURRENT_TIMESTAMP) THEN
      RAISE EXCEPTION 'Role activation has expired'
        USING ERRCODE = '23514';
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
      SELECT 1
      FROM "User" u
      WHERE u."id" = candidate_user_id AND u."status" = 'ACTIVE' AND u."role" = 'SUPER_ADMIN'
    ) OR EXISTS (
      SELECT 1
      FROM "UserRoleAssignment" assignment
      JOIN "Role" role ON role."id" = assignment."roleId"
      WHERE assignment."userId" = candidate_user_id
        AND assignment."id" <> NEW."id"
        AND role."name" = 'SUPER_ADMIN'
        AND role."isActive" = TRUE
        AND (assignment."status" = 'ACTIVE'
          OR (assignment."status" = 'PENDING' AND assignment."activationExpiresAt" > CURRENT_TIMESTAMP))
    ) INTO candidate_already_counted;

    IF candidate_already_counted THEN
      RETURN NEW;
    END IF;
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
          AND role."name" = 'SUPER_ADMIN'
          AND role."isActive" = TRUE
          AND (assignment."status" = 'ACTIVE'
            OR (assignment."status" = 'PENDING' AND assignment."activationExpiresAt" > CURRENT_TIMESTAMP))
      )
    );

  IF other_super_admin_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 Super Admin accounts reached'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;