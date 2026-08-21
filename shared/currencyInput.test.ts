import { describe, expect, it } from "vitest";
import { formatPastedCurrency, parsePastedCurrency } from "./currencyInput";

describe("entrada monetária colada", () => {
  it("interpreta ponto como decimal e converte a apresentação para vírgula", () => {
    expect(parsePastedCurrency("178472.02")).toBe(178472.02);
    expect(formatPastedCurrency("178472.02")).toBe("178.472,02");
  });

  it("preserva os formatos brasileiros com separador de milhar", () => {
    expect(parsePastedCurrency("178.472,02")).toBe(178472.02);
    expect(parsePastedCurrency("178472,02")).toBe(178472.02);
  });
});
