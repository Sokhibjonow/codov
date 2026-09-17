-- AlterTable
ALTER TABLE "Chat" ADD COLUMN "directKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Chat_directKey_key" ON "Chat"("directKey");
