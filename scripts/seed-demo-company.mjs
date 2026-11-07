/**
 * Create or reset the local SmartApply demo company login in MongoDB.
 * Run with: npm run seed:demo-company
 * Refuses production to prevent resetting a real account.
 */
import { randomBytes, scryptSync } from "node:crypto";
import mongoose from "mongoose";

if (process.env.NODE_ENV === "production") {
  throw new Error("Le compte démo ne peut pas être initialisé en production.");
}

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/smartapply";
const email = "company.posts@smartapply.tn";
const password = process.env.DEMO_COMPANY_PASSWORD || "TestPosts123!";
if (password.length < 8 || password.length > 128) {
  throw new Error("DEMO_COMPANY_PASSWORD doit contenir entre 8 et 128 caractères.");
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64).toString("hex");
const passwordHash = `scrypt$${salt.toString("hex")}$${hash}`;

await mongoose.connect(uri);
try {
  const db = mongoose.connection.db;
  const users = db.collection("users");
  const existing = await users.findOne({ email }, { projection: { _id: 1 } });
  const userId = existing?._id ? String(existing._id) : new mongoose.Types.ObjectId().toHexString();

  await users.updateOne(
    { email },
    {
      $set: {
        email,
        passwordHash,
        name: "SmartApply Demo Company",
        role: "COMPANY",
        plan: "FREE",
        updatedAt: new Date(),
      },
      $setOnInsert: { _id: userId, createdAt: new Date() },
    },
    { upsert: true },
  );

  // Keep the demo login linked to a public company name, not the email-derived
  // placeholder that older seeds created ("company posts").
  await db.collection("companies").updateOne(
    { $or: [{ ownerEmail: email }, { recruiterEmail: email }] },
    {
      $set: {
        name: "ISELM Tech",
        updatedAt: new Date(),
      },
    },
  );

  await db.collection("auth_sessions").deleteMany({ userId });
  console.log(`Compte démo entreprise prêt : ${email}`);
  console.log("Mot de passe : valeur DEMO_COMPANY_PASSWORD, ou TestPosts123! par défaut.");
} finally {
  await mongoose.disconnect();
}
