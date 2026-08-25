import { describe, expect, it } from "vitest";

describe("credenciais do Mercado Pago", () => {
  const validateExternalCredential = process.env.RUN_MERCADOPAGO_CREDENTIAL_TEST === "true";

  it.runIf(validateExternalCredential)("autoriza uma consulta leve à conta do vendedor", async () => {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    expect(accessToken, "MERCADOPAGO_ACCESS_TOKEN deve estar configurado").toBeTruthy();

    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8_000),
    });

    expect(response.ok, `Mercado Pago respondeu ${response.status}`).toBe(true);
  }, 10_000);
});
