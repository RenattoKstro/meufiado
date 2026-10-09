import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  getMercadoPagoWebhookDataId,
  verifyMercadoPagoWebhookSignature,
} from "./mercadoPago";

describe("webhook PIX do Mercado Pago", () => {
  it("valida o manifesto oficial x-signature", () => {
    const secret = "webhook-secret-test";
    const now = 1_800_000_000;
    const dataId = "123456789";
    const requestId = "request-abc";
    const ts = String(now);
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const hash = createHmac("sha256", secret).update(manifest).digest("hex");
    expect(verifyMercadoPagoWebhookSignature({
      secret,
      now,
      dataId,
      requestId,
      signature: `ts=${ts},v1=${hash}`,
    })).toBe(true);
    expect(verifyMercadoPagoWebhookSignature({
      secret,
      now,
      dataId,
      requestId,
      signature: `ts=${ts},v1=${"0".repeat(hash.length)}`,
    })).toBe(false);
  });

  it("prioriza o data.id da query e aceita o formato topic=payment", () => {
    expect(getMercadoPagoWebhookDataId({ "data.id": "42" }, { topic: "payment", id: "41" })).toBe("42");
    expect(getMercadoPagoWebhookDataId({}, { topic: "payment", id: "41" })).toBe("41");
  });
});
