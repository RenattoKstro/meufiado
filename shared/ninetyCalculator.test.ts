import { describe, expect, it } from "vitest";
import { calculateNinetyPercent } from "./ninetyCalculator";

describe("Calculadora 90%", () => {
  it("calcula quanto falta para alcançar 90% do total a receber", () => {
    expect(calculateNinetyPercent(10_000, 7_500)).toEqual({ totalReceivable: 10_000, totalReceived: 7_500, target: 9_000, result: 1_500 });
  });

  it("mostra resultado negativo quando o recebido ultrapassa a meta de 90%", () => {
    expect(calculateNinetyPercent(1_000, 950)).toMatchObject({ target: 900, result: -50 });
  });
});
