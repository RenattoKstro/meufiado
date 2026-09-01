import { describe, expect, it } from "vitest";
import { getBranchPerformance, hasBranchFinancialActivity, latestOverviewUpdate, resolveBranchOverviewMetrics } from "../shared/branchOverview";

describe("resumo de filiais", () => {
  it("prioriza métricas do operador e usa os valores da filial como base quando necessário", () => {
    const metrics = resolveBranchOverviewMetrics(
      { creditGoal: 12000, currentOverdue: 15000, monthOpening: 22000 },
      { creditGoal: 10000, challengeGoal: 8000, currentOverdue: 16000, lostGoal: 1000 },
    );

    expect(metrics).toMatchObject({
      creditGoal: 12000,
      currentOverdue: 15000,
      monthOpening: 22000,
      challengeGoal: 8000,
      lostGoal: 1000,
      lostReceived: 0,
    });
  });

  it("usa a data mais recente para informar a atualização do cartão da filial", () => {
    const latest = latestOverviewUpdate(new Date("2026-08-01T12:00:00Z"), null, new Date("2026-08-04T09:30:00Z"));
    expect(latest?.toISOString()).toBe("2026-08-04T09:30:00.000Z");
    expect(latestOverviewUpdate(null, undefined)).toBeNull();
  });

  it("identifica operações zeradas para o filtro visual de filiais", () => {
    expect(hasBranchFinancialActivity({ creditGoal: 0, challengeGoal: 0, currentOverdue: 0 })).toBe(false);
    expect(hasBranchFinancialActivity({ creditGoal: 5000, challengeGoal: 0, currentOverdue: 0 })).toBe(true);
    expect(hasBranchFinancialActivity({ monthOpening: 12000 })).toBe(true);
  });

  it("consolida saldos e premiações do detalhamento de uma filial", () => {
    const performance = getBranchPerformance("leader", resolveBranchOverviewMetrics({
      creditGoal: 9600,
      challengeGoal: 9600,
      currentOverdue: 10000,
      monthOpening: 15000,
      dayOpening: 11000,
      lostGoal: 1000,
      lostReceived: 1050,
      ticketWorkingDaysRemaining: 2,
    }), new Date("2026-08-18T12:00:00Z"));

    expect(performance.receipts).toEqual({ accumulated: 5000, today: 1000 });
    expect(performance.fiado).toMatchObject({ progress: 96, reward: 115.5, nextTarget: 98, missingForNext: 200, missingFor100: 400 });
    expect(performance.challenge).toMatchObject({ progress: 96, reward: 200, nextTarget: 98, missingForNext: 200, missingFor100: 400 });
    expect(performance.ticket).toMatchObject({ target: 4320, remaining: 0, dailyNeeded: 0 });
    expect(performance.lost).toMatchObject({ progress: 105, reward: 700, missingFor100: 0, missingFor105: 0 });
    expect(performance.totalReward).toBe(1015.5);
    expect(performance.totalPossibleReward).toBe(2087.5);
  });
});
