-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "neighborhood" TEXT,
    "placeId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "formattedAddress" TEXT,
    "verificationSource" TEXT NOT NULL DEFAULT 'google_places',
    "verificationScore" DOUBLE PRECISION,
    "verificationDistanceMeters" DOUBLE PRECISION,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venue_placeId_key" ON "Venue"("placeId");

-- CreateIndex
CREATE INDEX "Venue_normalizedName_idx" ON "Venue"("normalizedName");
