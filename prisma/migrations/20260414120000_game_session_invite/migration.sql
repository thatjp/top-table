-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN "inviteToken" TEXT;

-- UniqueIndex
CREATE UNIQUE INDEX "GameSession_inviteToken_key" ON "GameSession"("inviteToken");

-- AlterTable
ALTER TABLE "GameSession" ALTER COLUMN "playerTwoId" DROP NOT NULL;
