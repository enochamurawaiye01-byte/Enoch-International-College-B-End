ALTER TABLE "ReportCard"
ADD COLUMN "studentPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "parentPublished" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ReportCard"
SET "studentPublished" = "published",
    "parentPublished" = "published";
