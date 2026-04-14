import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("Skipping admin seed: set ADMIN_EMAIL and ADMIN_PASSWORD");
    return;
  }

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
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
