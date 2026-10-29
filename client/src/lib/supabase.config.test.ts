import { describe, expect, it } from "vitest";

describe("configuração pública do Supabase", () => {
  it("alcança o endpoint REST usando a chave anon configurada", async () => {
    const url = process.env.VITE_SUPABASE_URL || "https://mixlupweuzshctnldeyl.supabase.co";
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    expect(anonKey, "VITE_SUPABASE_ANON_KEY deve estar configurada").toBeTruthy();

    const response = await fetch(`${url}/rest/v1/appTextSettings?select=id&limit=1`, {
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(404);
  }, 15_000);
});
