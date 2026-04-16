import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import verifiedVenues from "../imports/verified_venues_report.json";

const prisma = new PrismaClient();

type VerifiedVenueSeedRow = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
};

function normalizeVenueName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    const pinHash = await bcrypt.hash("1234", 10);
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        pinHash,
        displayName: "Admin",
        validated: true,
        isAdmin: true,
      },
      update: {
        passwordHash,
        validated: true,
        isAdmin: true,
      },
    });
    console.log(`Seeded admin user: ${email} (default game PIN: 1234)`);
  } else {
    console.warn("Skipping admin seed: set ADMIN_EMAIL and ADMIN_PASSWORD");
  }

  let venuesSeeded = 0;
  for (const row of verifiedVenues as VerifiedVenueSeedRow[]) {
    if (!row.placeId || !row.name) continue;
    await prisma.venue.upsert({
      where: { placeId: row.placeId },
      create: {
        name: row.name,
        normalizedName: normalizeVenueName(row.name),
        placeId: row.placeId,
        latitude: row.lat,
        longitude: row.lng,
        formattedAddress: row.address || null,
        verificationSource: "seed_verified_venues_report",
        verifiedAt: new Date(),
      },
      update: {
        name: row.name,
        normalizedName: normalizeVenueName(row.name),
        latitude: row.lat,
        longitude: row.lng,
        formattedAddress: row.address || null,
        verificationSource: "seed_verified_venues_report",
        verifiedAt: new Date(),
      },
    });
    venuesSeeded += 1;
  }
  console.log(`Seeded venues from verified report: ${venuesSeeded}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
