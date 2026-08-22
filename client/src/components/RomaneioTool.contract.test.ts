import { describe, expect, it } from "vitest";
import { signatureStyleLabel, signatureStyles } from "./RomaneioTool";

describe("estilos de assinatura do Romaneio", () => {
  it("disponibiliza estilos distintos para o gerente escolher antes de assinar", () => {
    expect(signatureStyles.map(style => style.id)).toEqual(["classica", "manuscrita", "elegante", "simples"]);
    expect(signatureStyles.every(style => style.font.length > 12)).toBe(true);
  });

  it("identifica a escrita diretamente na tela como assinatura manual", () => {
    expect(signatureStyleLabel("manual")).toBe("Manual");
  });
});
