ALTER TABLE "Document" ADD COLUMN "deadlineStart" TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN "deadlineEnd" TIMESTAMP(3);
UPDATE "Document" SET "deadlineStart" = "deadline", "deadlineEnd" = "deadline" WHERE "deadline" IS NOT NULL;
ALTER TABLE "Document" DROP COLUMN "deadline";
