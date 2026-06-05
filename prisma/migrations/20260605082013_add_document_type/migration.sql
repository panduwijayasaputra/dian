-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INCOMING_LETTER', 'OUTGOING_LETTER', 'DISPOSITION', 'MEMO', 'REPORT', 'DECREE', 'OTHER');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "documentType" "DocumentType";
