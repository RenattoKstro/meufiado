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

    expect(projection).toMatchObject({ source: "daily-history", totalReceived: 3_000, daysBase: 3, averagePerDay: 1_000, projectedReceived: 13_000, dailyNeeded: 1_200 });
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

    expect(projection).toMatchObject({ source: "dashboard-total", totalReceived: 4_000, daysBase: 4, averagePerDay: 1_000, projectedReceived: 10_000, dailyNeeded: 1_333.3333333333333 });
  });

  it("nunca projeta recebimentos acima do saldo total disponível", () => {
    const projection = receiptProjection({
      historyTotalReceived: 20_000,
      historyDaysRecorded: 1,
      fallbackTotalReceived: 0,
      workingDaysElapsed: 1,
      workingDaysRemaining: 20,
      remainingToReceive: 5_000,
    });

    expect(projection.projectedReceived).toBe(25_000);
    expect(projection.projectedCollectionRate).toBe(100);
  });
});
