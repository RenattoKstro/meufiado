import { describe, expect, it } from "vitest";
import { hasBranchFinancialActivity, latestOverviewUpdate, resolveBranchOverviewMetrics } from "../shared/branchOverview";

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
});
