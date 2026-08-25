import { describe, expect, it } from "vitest";

describe("credenciais do Mercado Pago", () => {
  it("autoriza uma consulta leve à conta do vendedor", async () => {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    expect(accessToken, "MERCADOPAGO_ACCESS_TOKEN deve estar configurado").toBeTruthy();

    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.ok, `Mercado Pago respondeu ${response.status}`).toBe(true);
  }, 15_000);
});
