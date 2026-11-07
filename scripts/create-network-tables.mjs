import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `DO $$ BEGIN
    CREATE TYPE "NetworkTargetType" AS ENUM ('COMPANY', 'CANDIDATE');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "NetworkConnectStatus" AS ENUM ('PENDING', 'CONNECTED');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "network_follows" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_type" "NetworkTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "network_follows_user_id_target_type_target_id_key"
    ON "network_follows"("user_id", "target_type", "target_id")`,
  `CREATE INDEX IF NOT EXISTS "network_follows_user_id_created_at_idx"
    ON "network_follows"("user_id", "created_at")`,
  `CREATE INDEX IF NOT EXISTS "network_follows_target_type_target_id_idx"
    ON "network_follows"("target_type", "target_id")`,
  `CREATE TABLE IF NOT EXISTS "network_connections" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "requester_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "status" "NetworkConnectStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "network_connections_requester_id_target_id_key"
    ON "network_connections"("requester_id", "target_id")`,
  `CREATE INDEX IF NOT EXISTS "network_connections_target_id_status_idx"
    ON "network_connections"("target_id", "status")`,
];

async function main() {
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("OK: network_follows + network_connections");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
