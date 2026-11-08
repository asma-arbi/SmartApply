import mongoose from 'mongoose';
import { seedIfEmpty } from './seed';

const globalCache = globalThis as typeof globalThis & {
  mongooseCache?: {
    promise: Promise<typeof mongoose> | null;
  };
};

const cache = globalCache.mongooseCache ?? { promise: null };
globalCache.mongooseCache = cache;

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI manquant. Ajoutez-le dans smartapply-front/.env.local');
  }
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri);
  }
  await cache.promise;
  if (process.env.SEED !== 'false') {
    await seedIfEmpty();
  }
}