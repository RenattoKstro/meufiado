import { describe, expect, it } from "vitest";

describe("credenciais do Mercado Pago", () => {
  it("aceita o token em um endpoint leve de métodos de pagamento", async () => {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    expect(token, "MERCADOPAGO_ACCESS_TOKEN não configurado").toBeTruthy();

    const response = await fetch("https://api.mercadopago.com/v1/payment_methods", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status, await response.text()).toBe(200);
  }, 30_000);

  it("mantém o segredo do webhook configurado sem imprimir seu valor", () => {
    expect(process.env.MERCADOPAGO_WEBHOOK_SECRET, "MERCADOPAGO_WEBHOOK_SECRET não configurado").toBeTruthy();
  });
});
