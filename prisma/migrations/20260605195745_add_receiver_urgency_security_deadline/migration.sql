-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('BIASA', 'SEGERA', 'SANGAT_SEGERA');

-- CreateEnum
CREATE TYPE "SecurityLevel" AS ENUM ('BIASA', 'TERBATAS', 'RAHASIA', 'SANGAT_RAHASIA');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "receiver" TEXT,
ADD COLUMN     "security" "SecurityLevel",
ADD COLUMN     "urgency" "UrgencyLevel";
