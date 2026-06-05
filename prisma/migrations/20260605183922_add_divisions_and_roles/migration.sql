-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "division_id" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDivision" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "division_id" TEXT NOT NULL,

    CONSTRAINT "DocumentDivision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Division_name_key" ON "Division"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentDivision_document_id_division_id_key" ON "DocumentDivision"("document_id", "division_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDivision" ADD CONSTRAINT "DocumentDivision_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDivision" ADD CONSTRAINT "DocumentDivision_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;
