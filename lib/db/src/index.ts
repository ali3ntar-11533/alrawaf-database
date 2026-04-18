import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

/* Prevent unhandled 'error' event from crashing the process when a background
   pool client encounters a network hiccup. The individual query will still fail
   and return a 500 to the caller — the server keeps running. */
pool.on("error", (err) => {
  process.stderr.write(`[pool] idle client error: ${err.message}\n`);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
