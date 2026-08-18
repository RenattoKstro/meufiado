import { describe, expect, it } from "vitest";
import {
  accumulatedReward,
  CHALLENGE_TIERS,
  dailyRequirement,
  fiadoMissingForTarget,
  fiadoPercentage,
  FIADO_TIERS,
  isTicketValid,
  missingForTarget,
  receiptAmounts,
  totalReward,
} from "../shared/goalRules";

describe("regras de premiação", () => {
  it("acumula as faixas de fiado já atingidas pelo líder", () => {
    expect(accumulatedReward(FIADO_TIERS.leader, 100)).toBe(535.5);
    expect(totalReward(FIADO_TIERS.leader)).toBe(787.5);
  });

  it("respeita as faixas específicas do operador auxiliar", () => {
    expect(accumulatedReward(FIADO_TIERS.assistant, 98)).toBe(157.5);
    expect(totalReward(CHALLENGE_TIERS.assistant)).toBe(350);
  });

  it("calcula falta e ritmo diário sem retornar valor negativo", () => {
    expect(missingForTarget(94, 10000, 8000)).toBe(1400);
    expect(dailyRequirement(1400, 22, 15)).toBe(200);
    expect(dailyRequirement(0, 22, 22)).toBe(0);
  });

  it("valida a meta ticket apenas quando 80% foi confirmado até o dia 15", () => {
    expect(isTicketValid(true)).toBe(true);
    expect(isTicketValid(false)).toBe(false);
  });

  it("calcula o percentual de fiado e os recebimentos pelas aberturas informadas", () => {
    expect(fiadoPercentage(667582.89, 939915.48)).toBeCloseTo(71.03, 2);
    expect(receiptAmounts(1641481.71, 939915.48, 939915.48)).toEqual({ accumulated: 701566.23, today: 0 });
    expect(fiadoMissingForTarget(80, 667582.89, 939915.48)).toBeCloseTo(84349.49, 2);
  });
});
