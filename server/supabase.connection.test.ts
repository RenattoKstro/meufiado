import { describe, expect, it } from "vitest";
import pg from "pg";

const { Client } = pg;

describe("conexão do banco Supabase", () => {
  it("aceita a conexão configurada e responde ao health check", async () => {
    const connectionString = process.env.SUPABASE_DATABASE_URL;
    expect(connectionString, "SUPABASE_DATABASE_URL deve estar configurada").toBeTruthy();

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10_000 });
    await client.connect();
    try {
      const result = await client.query<{ ok: number }>("SELECT 1 AS ok");
      expect(result.rows[0]?.ok).toBe(1);
    } finally {
      await client.end();
    }
  }, 20_000);
});
