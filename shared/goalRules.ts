export type OperatorType = "leader" | "assistant";

export type RewardTier = {
  target: number;
  reward: number;
};

export const FIADO_TIERS: Record<OperatorType, RewardTier[]> = {
  leader: [
    { target: 94, reward: 52.5 },
    { target: 96, reward: 63 },
    { target: 98, reward: 84 },
    { target: 99, reward: 94.5 },
    { target: 100, reward: 241.5 },
    { target: 101, reward: 84 },
    { target: 103, reward: 84 },
    { target: 105, reward: 84 },
  ],
  assistant: [
    { target: 94, reward: 105 },
    { target: 98, reward: 52.5 },
    { target: 100, reward: 157.5 },
  ],
};

export const CHALLENGE_TIERS: Record<OperatorType, RewardTier[]> = {
  leader: [
    { target: 96, reward: 200 },
    { target: 98, reward: 150 },
    { target: 100, reward: 150 },
  ],
  assistant: [
    { target: 96, reward: 100 },
    { target: 98, reward: 100 },
    { target: 100, reward: 150 },
  ],
};

export const LOST_TIERS: RewardTier[] = [
  { target: 100, reward: 500 },
  { target: 105, reward: 200 },
];

export function accumulatedReward(tiers: RewardTier[], progress: number) {
  return tiers.reduce((total, tier) => total + (progress >= tier.target ? tier.reward : 0), 0);
}

export function totalReward(tiers: RewardTier[]) {
  return tiers.reduce((total, tier) => total + tier.reward, 0);
}

export function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.max(0, (numerator / denominator) * 100);
}

export function fiadoPercentage(creditGoal: number, currentOverdue: number) {
  return percentage(creditGoal, currentOverdue);
}

export function receiptAmounts(monthOpening: number, dayOpening: number, currentOverdue: number) {
  return {
    accumulated: Math.max(monthOpening - currentOverdue, 0),
    today: Math.max(dayOpening - currentOverdue, 0),
  };
}

export function fiadoMissingForTarget(targetPercent: number, creditGoal: number, currentOverdue: number) {
  return Math.max(0, (currentOverdue * targetPercent) / 100 - creditGoal);
}

export function missingForTarget(targetPercent: number, referenceGoal: number, received: number) {
  return Math.max(0, (referenceGoal * targetPercent) / 100 - received);
}

export function dailyRequirement(missingAmount: number, workingDaysTotal: number, workingDaysElapsed: number) {
  const daysRemaining = Math.max(workingDaysTotal - workingDaysElapsed, 0);
  return daysRemaining > 0 ? missingAmount / daysRemaining : 0;
}

export function isTicketValid(fiadoReachedByDay15: boolean) {
  return fiadoReachedByDay15;
}
