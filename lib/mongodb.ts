import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smartapply";
const options = {
  serverSelectionTimeoutMS: 8000,
  maxPoolSize: 10,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!process.env.MONGODB_URI) {
  // Note: Fallback to localhost for development
  console.info("[MongoDB] Variable MONGODB_URI non définie, utilisation de mongodb://127.0.0.1:27017/smartapply par défaut.");
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Retourne le client MongoDB connecté
 */
export async function getMongoClient(): Promise<MongoClient> {
  return await clientPromise;
}

/**
 * Retourne la base de données MongoDB par défaut
 */
export async function getDb(dbName?: string): Promise<Db> {
  const c = await getMongoClient();
  return c.db(dbName || "smartapply");
}

let indexesInitialized = false;

/**
 * Initialisation automatique des index MongoDB et du compte administrateur initial
 */
export async function initDatabase(): Promise<void> {
  if (indexesInitialized) return;
  try {
    const db = await getDb();

    // 1. Index Users
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ role: 1 });

    // 2. Index Profiles
    await db.collection("profiles").createIndex({ id: 1 }, { unique: true });
    await db.collection("profiles").createIndex({ role: 1 });

    // 3. Index Sessions
    await db.collection("sessions").createIndex({ id: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ user_id: 1 });
    await db.collection("sessions").createIndex({ expires_at: 1 });

    // 4. Index Companies
    await db.collection("companies").createIndex({ id: 1 }, { unique: true });
    await db.collection("companies").createIndex({ status: 1 });

    // 5. Index Jobs
    await db.collection("jobs").createIndex({ id: 1 }, { unique: true });
    await db.collection("jobs").createIndex({ company_id: 1 });
    await db.collection("jobs").createIndex({ status: 1 });

    indexesInitialized = true;
  } catch (err) {
    console.warn("[MongoDB] Avertissement lors de la création des index :", (err as Error).message);
  }
}
