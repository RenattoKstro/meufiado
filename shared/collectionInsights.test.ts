import { describe, expect, it } from "vitest";
import { collectionProjectionRisk, fiadoGoalGap, monthOverMonth } from "./collectionInsights";

describe("insights de recebimento", () => {
  it("sinaliza risco quando o saldo projetado excede a Meta Fiado", () => {
    expect(collectionProjectionRisk({ monthOpening: 100000, projectedReceived: 80000, creditGoal: 10000 })).toMatchObject({
      status: "critical", projectedOverdue: 20000, amountToRecover: 10000,
    });
  });

  it("reconhece uma projeção saudável e calcula evolução entre meses", () => {
    expect(collectionProjectionRisk({ monthOpening: 100000, projectedReceived: 93000, creditGoal: 10000 }).status).toBe("healthy");
    expect(monthOverMonth(12000, 10000)).toMatchObject({ direction: "up", difference: 2000, percent: 20 });
  });

  it("informa se o GAP projetado está dentro ou fora da Meta Fiado", () => {
    expect(fiadoGoalGap({ projectedOverdue: 8_000, creditGoal: 10_000 })).toMatchObject({
      status: "inside", amount: 2_000,
    });
    expect(fiadoGoalGap({ projectedOverdue: 12_500, creditGoal: 10_000 })).toMatchObject({
      status: "outside", amount: 2_500,
    });
  });
});
