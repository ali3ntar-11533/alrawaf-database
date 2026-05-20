import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // strict: prevents drizzle-kit from auto-applying destructive changes
  // (drop table / drop column) without explicit confirmation.
  // This protects existing data (users, contractors, etc.) from accidental loss.
  strict: true,
  verbose: true,
});
