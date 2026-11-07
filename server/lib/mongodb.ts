import mongoose from "mongoose";

// Next loads .env.local before .env and does not merge missing values from .env.
// Read only the local Mongo connection fallback when it was omitted there.
import { readFileSync } from "node:fs";
import path from "node:path";

if (!process.env.MONGODB_URI) {
  try {
    const envText = readFileSync(path.join(process.cwd(), ".env"), "utf8");
    const match = envText.match(/^\s*MONGODB_URI\s*=\s*(["']?)([^\r\n"']+)\1\s*$/m);
    if (match?.[2]) process.env.MONGODB_URI = match[2].trim();
  } catch {
    // The explicit configuration error below explains the missing variable.
  }
}

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("MONGODB_URI manquant dans les variables d'environnement.");

// Cache the connection promise in dev to survive HMR hot-reloads
const globalForMongoose = globalThis as unknown as {
  mongoosePromise?: Promise<typeof mongoose>;
};

export async function connectDB(): Promise<typeof mongoose> {
  if (globalForMongoose.mongoosePromise) return globalForMongoose.mongoosePromise;

  const promise = mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForMongoose.mongoosePromise = promise;
  }

  return promise;
}

export { mongoose };

// Convenience wrapper matching old withDb pattern
export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  await connectDB();
  return fn();
}
