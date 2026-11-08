import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Charger .env.local si disponible
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        if (!process.env[k.trim()]) {
          process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  }
} catch (e) {
  // Ignorer
}

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://mohamedridha660_db_user:jnIPb80T2mPqYLEK@pwa.fhxrbgj.mongodb.net/smartapply?retryWrites=true&w=majority";

async function runSeed() {
  console.log("🌱 Connexion à MongoDB Atlas sur :", uri.replace(/:[^:@]+@/, ":****@"));
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

  try {
    await client.connect();
    const db = client.db("smartapply");

    console.log("⚡ Création des index...");
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ role: 1 });
    await db.collection("profiles").createIndex({ id: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ id: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ user_id: 1 });
    await db.collection("companies").createIndex({ id: 1 }, { unique: true });
    await db.collection("companies").createIndex({ status: 1 });
    await db.collection("jobs").createIndex({ id: 1 }, { unique: true });
    await db.collection("jobs").createIndex({ company_id: 1 });
    await db.collection("jobs").createIndex({ status: 1 });

    const passwordHash = await bcrypt.hash("asma123456789@", 10);
    const now = new Date().toISOString();

    // 1. Super Admin
    const adminId = "admin-" + crypto.randomUUID().slice(0, 8);
    const adminEmail = "asma.arbi@esprit.tn";
    await db.collection("users").updateOne(
      { email: adminEmail },
      {
        $set: {
          id: adminId,
          email: adminEmail,
          password_hash: passwordHash,
          name: "Asma Arbi (Super Admin)",
          role: "admin",
          created_at: now,
          updated_at: now,
        },
      },
      { upsert: true }
    );
    await db.collection("profiles").updateOne(
      { email: adminEmail },
      {
        $set: {
          id: adminId,
          role: "admin",
          full_name: "Asma Arbi",
          email: adminEmail,
          language: "fr",
          notifications_enabled: true,
          visible_to_companies: false,
          created_at: now,
          updated_at: now,
        },
      },
      { upsert: true }
    );
    console.log("✅ Super Admin configuré :", adminEmail);

    // 2. Entreprise Talan
    const talanId = "company-" + crypto.randomUUID().slice(0, 8);
    const talanEmail = "contact@talan.com";
    await db.collection("users").updateOne(
      { email: talanEmail },
      {
        $set: {
          id: talanId,
          email: talanEmail,
          password_hash: passwordHash,
          name: "Talan Tunisie",
          role: "entreprise",
          company_name: "Talan",
          created_at: now,
          updated_at: now,
        },
      },
      { upsert: true }
    );
    await db.collection("companies").updateOne(
      { name: "Talan" },
      {
        $set: {
          id: talanId,
          name: "Talan",
          status: "verified",
          sector: "IT",
          size: "500+",
          city: "Tunis",
          website: "https://talan.com",
          description: "Cabinet de conseil en innovation et transformation par la technologie.",
          created_at: now,
        },
      },
      { upsert: true }
    );
    console.log("✅ Entreprise configurée : Talan (contact@talan.com)");

    // 3. Candidat Test
    const candId = "cand-" + crypto.randomUUID().slice(0, 8);
    const candEmail = "candidat@esprit.tn";
    await db.collection("users").updateOne(
      { email: candEmail },
      {
        $set: {
          id: candId,
          email: candEmail,
          password_hash: passwordHash,
          name: "Mohamed Trabelsi",
          role: "candidat",
          created_at: now,
          updated_at: now,
        },
      },
      { upsert: true }
    );
    await db.collection("profiles").updateOne(
      { email: candEmail },
      {
        $set: {
          id: candId,
          role: "candidat",
          full_name: "Mohamed Trabelsi",
          email: candEmail,
          language: "fr",
          notifications_enabled: true,
          visible_to_companies: true,
          created_at: now,
          updated_at: now,
        },
      },
      { upsert: true }
    );
    console.log("✅ Candidat configuré : Mohamed Trabelsi (candidat@esprit.tn)");

    // 4. Offres d'emploi et Stages PFE
    const sampleJobs = [
      {
        id: "job-1",
        company_id: talanId,
        title: "Ingénieur Full Stack Next.js & Node.js",
        type: "CDI",
        location: "Tunis, Berges du Lac",
        description: "Rejoignez nos équipes pour concevoir des applications web et PWA modernes avec Next.js App Router, TypeScript et MongoDB.",
        status: "published",
        created_at: now,
      },
      {
        id: "job-2",
        company_id: talanId,
        title: "Stage PFE — Ingénierie Cloud & DevOps",
        type: "Stage",
        location: "Tunis, Ariane",
        description: "Sujet de fin d'études portant sur l'automatisation CI/CD, Docker, Kubernetes et le monitoring de microservices.",
        status: "published",
        created_at: now,
      },
    ];

    for (const job of sampleJobs) {
      await db.collection("jobs").updateOne(
        { id: job.id },
        { $set: job },
        { upsert: true }
      );
    }
    console.log("✅ Offres d'emploi & Stages PFE insérés.");

    console.log("\n🚀 Initialisation MongoDB terminée avec succès !");
  } catch (err) {
    console.error("❌ Erreur pendant l'initialisation :", err.message);
    if (err.message.includes("SSL") || err.message.includes("alert number 80") || err.message.includes("tlsv1 alert")) {
      console.log("\n💡 EXPLICATION & SOLUTION (Erreur SSL alert 80) :");
      console.log("--------------------------------------------------");
      console.log("MongoDB Atlas bloque la connexion car votre adresse IP actuelle n'est pas autorisée.");
      console.log("Pour débloquer en 30 secondes :");
      console.log("1. Allez sur votre tableau de bord MongoDB Atlas (cloud.mongodb.com).");
      console.log("2. Dans le menu de gauche sous 'SECURITY', cliquez sur 'Network Access'.");
      console.log("3. Cliquez sur le bouton vert '+ ADD IP ADDRESS'.");
      console.log("4. Cliquez sur 'ALLOW ACCESS FROM ANYWHERE' (ajoute 0.0.0.0/0).");
      console.log("5. Cliquez sur 'Confirm' et attendez 30 secondes (statut vert 'Active').");
      console.log("6. Relancez : npm run seed");
      console.log("--------------------------------------------------\n");
    }
  } finally {
    await client.close();
  }
}

runSeed();
