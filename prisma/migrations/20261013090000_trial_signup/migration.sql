-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "isTrial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offerLink" TEXT,
ADD COLUMN     "offerSeats" INTEGER,
ADD COLUMN     "offerStart" TIMESTAMP(3),
ADD COLUMN     "trialLessons" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "selfRegistered" BOOLEAN NOT NULL DEFAULT false;
