import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { resolveSupabaseConnectionString } from "./dbConnection";

describe("conexão de produção com Supabase", () => {
  it("executa uma consulta leve SELECT 1 sem expor a credencial", async () => {
    const connectionString = resolveSupabaseConnectionString();
    expect(connectionString).toBeTruthy();
    const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000, ssl: { rejectUnauthorized: false } });
    try {
      const result = await pool.query<{ ok: number }>("SELECT 1 AS ok");
      expect(result.rows[0]?.ok).toBe(1);
    } finally {
      await pool.end().catch(() => undefined);
    }
  }, 20_000);
});
