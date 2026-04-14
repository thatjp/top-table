-- Session lifecycle: closed when host logs the completed game
ALTER TABLE "GameSession" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "GameSession" ADD COLUMN "closedByUserId" TEXT;

CREATE INDEX "GameSession_closedAt_idx" ON "GameSession"("closedAt");

ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
