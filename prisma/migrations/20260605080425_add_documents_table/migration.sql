-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('LOCAL', 'UPLOADING', 'PROCESSING', 'READY', 'ERROR');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "r2Key" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADING',
    "documentNumber" TEXT,
    "documentDate" TIMESTAMP(3),
    "sender" TEXT,
    "subject" TEXT,
    "fileSizeBytes" INTEGER,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
