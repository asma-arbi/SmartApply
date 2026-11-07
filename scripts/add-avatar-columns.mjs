import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "catalog_companies" ADD COLUMN IF NOT EXISTS "logo_url" TEXT`,
  `ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT`,
];

async function main() {
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("OK: logo_url + avatar_url");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
