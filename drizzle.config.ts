import { defineConfig } from "drizzle-kit";
import { resolveSupabaseConnectionString } from "./server/dbConnection";

const connectionString = resolveSupabaseConnectionString();
if (!connectionString) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
