import { describe, expect, it } from "vitest";
import { dailyCollectionGoal, matrixReceivedAmount } from "./goalRules";

describe("matrixReceivedAmount", () => {
  it("calcula o recebido pela diferença entre vencido atual e Meta Fiado", () => {
    expect(matrixReceivedAmount(939_915.48, 667_582.89)).toBeCloseTo(272_332.59, 2);
  });

  it("não altera o sinal da diferença informada pela Matriz", () => {
    expect(matrixReceivedAmount(90, 100)).toBe(-10);
  });

  it("divide o saldo da meta pelos dias úteis restantes", () => {
    expect(dailyCollectionGoal(939_915.48, 667_582.89, 18)).toBeCloseTo(15_129.59, 2);
  });
});
