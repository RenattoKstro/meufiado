import { describe, expect, it } from "vitest";
import {
  accumulatedReward,
  amountReceivable,
  challengeMissingForTarget,
  challengePercentage,
  CHALLENGE_TIERS,
  dailyCollectionGoal,
  dailyRequirement,
  delinquencyPercentage,
  fiadoMissingForTarget,
  fiadoPercentage,
  FIADO_TIERS,
  isTicketValid,
  lostGoalMissingForTarget,
  missingForTarget,
  receiptAmounts,
  remainingToGoal,
  ticketPercentage,
  ticketGoalAmount,
  ticketGoalState,
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

  it("calcula a Meta Diária pelo restante até a Meta Fiado dividido pelos dias restantes", () => {
    expect(remainingToGoal(939915.48, 667582.89)).toBeCloseTo(272332.59, 2);
    expect(dailyCollectionGoal(939915.48, 667582.89, 4)).toBeCloseTo(68083.1475, 4);
    expect(dailyCollectionGoal(650000, 667582.89, 4)).toBe(0);
    expect(dailyCollectionGoal(939915.48, 667582.89, 0)).toBe(0);
  });

  it("calcula a Meta Desafio pela meta cadastrada sobre o vencido atual", () => {
    expect(challengePercentage(667582.89, 939915.48)).toBeCloseTo(71.03, 2);
    expect(challengeMissingForTarget(96, 667582.89, 939915.48)).toBeCloseTo(234735.9708, 4);
  });

  it("calcula a Meta de 80% sobre o valor a receber", () => {
    const receivable = amountReceivable(1641481.71, 667582.89);
    expect(receivable).toBeCloseTo(973898.82, 2);
    expect(ticketPercentage(701566.23, receivable)).toBeCloseTo(72.0368703, 6);
  });

  it("calcula valor-alvo, saldo diário e invalida a Meta de 80% após o dia 15", () => {
    const receivable = 973898.82;
    expect(ticketGoalAmount(receivable)).toBeCloseTo(779119.056, 3);
    const beforeDeadline = ticketGoalState({ receivedAccumulated: 701566.23, receivableAmount: receivable, workingDaysRemaining: 4, reachedByDay15: false, referenceDate: new Date("2026-08-14T12:00:00") });
    expect(beforeDeadline.status).toBe("in_progress");
    expect(beforeDeadline.remaining).toBeCloseTo(77552.826, 3);
    expect(beforeDeadline.dailyNeeded).toBeCloseTo(19388.2065, 4);
    const afterDeadline = ticketGoalState({ receivedAccumulated: 701566.23, receivableAmount: receivable, workingDaysRemaining: 0, reachedByDay15: false, referenceDate: new Date("2026-08-16T12:00:00") });
    expect(afterDeadline.status).toBe("expired");
    const reachedOnTime = ticketGoalState({ receivedAccumulated: 800000, receivableAmount: receivable, workingDaysRemaining: 0, reachedByDay15: true, referenceDate: new Date("2026-08-16T12:00:00") });
    expect(reachedOnTime.status).toBe("achieved");
  });

  it("calcula a inadimplência e os saldos da Meta Perdido para 100% e 105%", () => {
    expect(delinquencyPercentage(65000, 1000000)).toBe(6.5);
    expect(delinquencyPercentage(70000, 1000000)).toBeCloseTo(7, 10);
    expect(lostGoalMissingForTarget(100, 10000, 8200)).toBe(1800);
    expect(lostGoalMissingForTarget(105, 10000, 8200)).toBe(2300);
    expect(lostGoalMissingForTarget(100, 10000, 10500)).toBe(0);
  });
});
