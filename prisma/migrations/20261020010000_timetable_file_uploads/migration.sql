ALTER TABLE "Timetable"
ADD COLUMN "scheduleFileUrl" TEXT,
ADD COLUMN "scheduleFileName" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
