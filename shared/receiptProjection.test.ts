import { describe, expect, it } from "vitest";
import { receiptProjection } from "./receiptProjection";

describe("projeção de recebimentos", () => {
  it("prioriza a média dos recebimentos diários registrados", () => {
    const projection = receiptProjection({
      historyTotalReceived: 3_000,
      historyDaysRecorded: 3,
      fallbackTotalReceived: 4_500,
      workingDaysElapsed: 5,
      workingDaysRemaining: 10,
      remainingToReceive: 12_000,
    });

    expect(projection).toMatchObject({ source: "daily-history", totalReceived: 3_000, daysBase: 3, averagePerDay: 1_000, projectedReceived: 12_100, dailyNeeded: 1_200, targetReceived: 15_000, weightedDaysRemaining: 9.1 });
  });

  it("usa o total do painel e os dias úteis quando não existem lançamentos diários", () => {
    const projection = receiptProjection({
      historyTotalReceived: 0,
      historyDaysRecorded: 0,
      fallbackTotalReceived: 4_000,
      workingDaysElapsed: 4,
      workingDaysRemaining: 6,
      remainingToReceive: 8_000,
    });

    expect(projection).toMatchObject({ source: "dashboard-total", totalReceived: 4_000, daysBase: 4, averagePerDay: 1_000, projectedReceived: 9_100, dailyNeeded: 1_333.3333333333333, targetReceived: 12_000, weightedDaysRemaining: 5.1 });
  });

  it("limita o forecast a 101% da Meta Fiado", () => {
    const projection = receiptProjection({
      historyTotalReceived: 20_000,
      historyDaysRecorded: 1,
      fallbackTotalReceived: 0,
      workingDaysElapsed: 1,
      workingDaysRemaining: 20,
      remainingToReceive: 5_000,
    });

    expect(projection.projectedReceived).toBe(25_250);
    expect(projection.projectedCollectionRate).toBe(101);
  });
});
