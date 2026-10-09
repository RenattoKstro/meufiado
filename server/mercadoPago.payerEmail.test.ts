import { describe, expect, it } from "vitest";
import { getMercadoPagoPayerEmail } from "./mercadoPago";

describe("e-mail do pagador Mercado Pago", () => {
  it("preserva um e-mail externo válido", () => {
    expect(getMercadoPagoPayerEmail(" Pessoa@Example.com ", 31)).toBe("pessoa@example.com");
  });

  it("substitui o e-mail técnico .invalid por um endereço válido e estável", () => {
    expect(getMercadoPagoPayerEmail("teste@local.meufiado.invalid", 24453284)).toBe("pagamento+usuario-24453284@meufiado.com");
    expect(getMercadoPagoPayerEmail(undefined, 31)).toBe("pagamento+usuario-31@meufiado.com");
  });
});
