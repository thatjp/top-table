-- Lobby: startedAt is null until the host starts the match clock.
ALTER TABLE "GameSession" ALTER COLUMN "startedAt" DROP DEFAULT;
ALTER TABLE "GameSession" ALTER COLUMN "startedAt" DROP NOT NULL;
