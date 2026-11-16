import { describe, expect, it } from "vitest";
import { dailyCollectionGoal, matrixReceivedAmount, ticketGoalState } from "./goalRules";

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

  it("prioriza a marcação manual da Meta Alimentação", () => {
    const base = { receivedAccumulated: 10, receivableAmount: 100, workingDaysRemaining: 0, reachedByDay15: false, referenceDate: new Date("2026-11-20T12:00:00") };
    expect(ticketGoalState({ ...base, manualStatus: true }).status).toBe("achieved");
    expect(ticketGoalState({ ...base, manualStatus: false }).status).toBe("expired");
    expect(ticketGoalState(base).status).toBe("expired");
  });
});
