import { describe, expect, it } from "vitest";
import { createPixPayload, pixCrc16 } from "./pix";

describe("payload PIX", () => {
  it("gera um BR Code com a chave, valor e CRC coerentes", () => {
    const payload = createPixPayload({ key: "contato@meufiado.com", amount: 29.9, receiverName: "Meu Fiado", receiverCity: "Brasília" });
    expect(payload).toContain("0014BR.GOV.BCB.PIX");
    expect(payload).toContain("0120contato@meufiado.com");
    expect(payload).toContain("540529.90");
    expect(payload).toContain("5909MEU FIADO");
    expect(payload).toContain("6008BRASILIA");
    expect(payload.endsWith(pixCrc16(payload.slice(0, -4)))).toBe(true);
  });

  it("rejeita cobrança sem chave, valor ou identificação suficiente", () => {
    expect(() => createPixPayload({ key: "", amount: 10, receiverName: "Meu Fiado", receiverCity: "Brasilia" })).toThrow("chave PIX");
    expect(() => createPixPayload({ key: "contato@meufiado.com", amount: 0, receiverName: "Meu Fiado", receiverCity: "Brasilia" })).toThrow("valor PIX");
    expect(() => createPixPayload({ key: "contato@meufiado.com", amount: 10, receiverName: "M", receiverCity: "Brasilia" })).toThrow("nome do recebedor");
  });
});
