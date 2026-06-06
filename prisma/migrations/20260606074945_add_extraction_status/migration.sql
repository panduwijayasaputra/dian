-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('pending', 'completed', 'failed', 'manual_only');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'pending';
