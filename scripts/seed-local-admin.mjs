/** Create a one-time local administrator account without changing an existing user. */
import { randomBytes, scryptSync } from "node:crypto";
import mongoose from "mongoose";

if (process.env.NODE_ENV === "production") {
  throw new Error("La création du compte admin de démonstration est interdite en production.");
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI doit être configuré dans .env.local.");

const email = (process.env.LOCAL_ADMIN_EMAIL || "smartapply.admin@smartapply.tn").trim().toLowerCase();
const password = process.env.LOCAL_ADMIN_PASSWORD || randomBytes(24).toString("base64url");
if (password.length < 16 || password.length > 128) {
  throw new Error("Le mot de passe admin doit contenir entre 16 et 128 caractères.");
}

const salt = randomBytes(16);
const passwordHash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;

await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
try {
  const users = mongoose.connection.db.collection("users");
  const existing = await users.findOne({ email }, { projection: { _id: 1, role: 1 } });
  if (existing) {
    throw new Error(`Un compte existe déjà pour ${email}; aucun compte n'a été modifié.`);
  }

  await users.insertOne({
    _id: new mongoose.Types.ObjectId().toHexString(),
    email,
    passwordHash,
    name: "SmartApply Admin",
    role: "ADMIN",
    plan: "FREE",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Compte admin local créé : ${email}`);
  console.log(`Mot de passe temporaire : ${password}`);
  console.log("Connectez-vous sur /login puis ouvrez /admin.");
} finally {
  await mongoose.disconnect();
}
