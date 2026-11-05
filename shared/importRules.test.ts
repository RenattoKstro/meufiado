import { describe, expect, it } from "vitest";
import { spreadsheetNumber, spreadsheetPercent } from "./importRules";

describe("conversão de valores da planilha", () => {
  it("arredonda valores monetários brutos para centavos", () => {
    expect(spreadsheetNumber(750417.911503467)).toBe(750417.91);
    expect(spreadsheetNumber("R$ 750.417,91")).toBe(750417.91);
  });

  it("converte 1 armazenado pelo Excel como fração para 100%", () => {
    expect(spreadsheetPercent(1)).toBe(100);
    expect(spreadsheetPercent("100,00%")).toBe(100);
  });
});
