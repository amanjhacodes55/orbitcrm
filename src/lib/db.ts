import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/orbitcrm";
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { _orbitMongo?: Cache };
const cache: Cache = g._orbitMongo ?? (g._orbitMongo = { conn: null, promise: null });

export async function dbConnect() {
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 8000 });
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null; // don't cache a failed connection; retry on the next request
    throw e;
  }
  return cache.conn;
}
