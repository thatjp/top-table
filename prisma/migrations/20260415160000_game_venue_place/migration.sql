-- Google Places venue linkage (optional on legacy rows)
ALTER TABLE "Game" ADD COLUMN "placeId" TEXT;
ALTER TABLE "Game" ADD COLUMN "locationLat" DOUBLE PRECISION;
ALTER TABLE "Game" ADD COLUMN "locationLng" DOUBLE PRECISION;

CREATE INDEX "Game_placeId_idx" ON "Game"("placeId");
