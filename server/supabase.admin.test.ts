import { describe, expect, it } from "vitest";

describe("credencial administrativa do Supabase", () => {
  it("alcança o endpoint administrativo sem expor o valor da chave", async () => {
    const url = process.env.VITE_SUPABASE_URL || "https://mixlupweuzshctnldeyl.supabase.co";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY deve estar configurada").toBeTruthy();

    const response = await fetch(`${url}/auth/v1/admin/users?per_page=1`, {
      headers: {
        apikey: serviceRoleKey!,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    expect(response.status).toBe(200);
  }, 15_000);
});
