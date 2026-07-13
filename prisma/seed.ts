import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { z } from "zod";

const prisma = new PrismaClient();

const seedEnv = z
  .object({
    ADMIN_EMAIL: z.string().trim().toLowerCase().email(),
    ADMIN_PASSWORD: z.string().min(8).max(200),
  })
  .parse(process.env);

async function main() {
  const passwordHash = await bcrypt.hash(seedEnv.ADMIN_PASSWORD, 12);
  const admin = await prisma.admin.upsert({
    where: { email: seedEnv.ADMIN_EMAIL },
    create: {
      email: seedEnv.ADMIN_EMAIL,
      passwordHash,
      role: "admin",
      active: true,
    },
    update: { passwordHash, role: "admin", active: true },
  });

  console.log(`Admin account seeded: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error("Database seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
