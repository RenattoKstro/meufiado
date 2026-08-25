import { afterEach, describe, expect, it, vi } from "vitest";
import { createRecurringPreapproval, validateMercadoPagoWebhook } from "./mercadoPago";

describe("cliente Mercado Pago", () => {
  const originalToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = originalToken;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("cria uma preapproval mensal com referência e webhook próprios", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "pre-9", status: "pending", init_point: "https://mp.example/checkout" }), { status: 201 })) as typeof fetch;

    const result = await createRecurringPreapproval({ payerEmail: "operador@example.com", externalReference: "mf-pro-31-token", monthlyPrice: 19.9, notificationUrl: "https://app.example.com/api/mercadopago/webhook", backUrl: "https://app.example.com/plano" });

    expect(result).toMatchObject({ id: "pre-9", init_point: "https://mp.example/checkout" });
    expect(global.fetch).toHaveBeenCalledWith("https://api.mercadopago.com/preapproval", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer TEST-token" }) }));
    const request = vi.mocked(global.fetch).mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ external_reference: "mf-pro-31-token", payer_email: "operador@example.com", auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 19.9, currency_id: "BRL" } });
  });

  it("rejeita notificações sem os dados mínimos da assinatura", async () => {
    await expect(validateMercadoPagoWebhook({ dataId: "123" })).resolves.toBe(false);
  });
});
