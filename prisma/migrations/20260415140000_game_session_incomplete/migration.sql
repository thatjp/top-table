-- Auto-marked when a started match exceeds the active window without being logged/closed
ALTER TABLE "GameSession" ADD COLUMN "incompleteAt" TIMESTAMP(3);

CREATE INDEX "GameSession_incompleteAt_idx" ON "GameSession"("incompleteAt");
