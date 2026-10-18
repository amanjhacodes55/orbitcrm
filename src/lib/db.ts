import mongoose, { Mongoose, type Schema } from "mongoose";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/orbitcrm";
const opts = { serverSelectionTimeoutMS: 8000 };

// ---------- Node (Render / local): one shared connection for the whole process ----------
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { _orbitMongo?: Cache };
const cache: Cache = g._orbitMongo ?? (g._orbitMongo = { conn: null, promise: null });

// ---------- Cloudflare Workers: one connection per request ----------
// Workers forbid using a socket opened by an earlier request, so a process-wide connection
// hangs on the second request. Each request gets its own Mongoose instance instead, and the
// exported models (see models.ts) forward to it.
export const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
const schemas = new Map<string, Schema>();
const perRequest = new WeakMap<object, { inst: Mongoose; ready: Promise<Mongoose> }>();

/** Called by models.ts so per-request instances can compile every model. */
export function registerSchema(name: string, schema: Schema) {
  schemas.set(name, schema);
}

function requestScope() {
  const { ctx } = getCloudflareContext();
  let s = perRequest.get(ctx);
  if (!s) {
    const inst = new Mongoose();
    for (const [name, schema] of schemas) inst.model(name, schema); // populate() looks models up by name
    // Buffer commands so a model used before dbConnect() still waits for the connection.
    const ready = inst.connect(uri, { ...opts, bufferCommands: true, maxPoolSize: 2 });
    ready.catch(() => {}); // surfaced by dbConnect() / the buffered query instead
    s = { inst, ready };
    perRequest.set(ctx, s);
  }
  return s;
}

/** The model to use for this request: per-request on Workers, the global one elsewhere. */
export function resolveModel(name: string) {
  if (!onWorkers) return mongoose.model(name);
  const { inst } = requestScope();
  return inst.models[name] ?? inst.model(name, schemas.get(name)!);
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (onWorkers) return requestScope().ready;
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(uri, { ...opts, bufferCommands: false });
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null; // don't cache a failed connection; retry on the next request
    throw e;
  }
  return cache.conn;
}
