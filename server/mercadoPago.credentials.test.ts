import { describe, expect, it } from "vitest";

describe("credenciais do Mercado Pago", () => {
  it("aceita o Access Token configurado pelo projeto", async () => {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    expect(accessToken, "MERCADO_PAGO_ACCESS_TOKEN não configurado").toBeTruthy();
    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status, "Access Token do Mercado Pago rejeitado").toBe(200);
    const body = await response.json() as { id?: number };
    expect(body.id).toEqual(expect.any(Number));
  }, 15_000);
});
