-- CreateEnum
CREATE TYPE "EmbeddingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "embeddingStatus" "EmbeddingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "summary" TEXT;

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
