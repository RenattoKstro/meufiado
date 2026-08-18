import {
  accumulatedReward,
  amountReceivable,
  challengeMissingForTarget,
  challengePercentage,
  CHALLENGE_TIERS,
  delinquencyPercentage,
  fiadoMissingForTarget,
  fiadoPercentage,
  FIADO_TIERS,
  LOST_TIERS,
  lostGoalMissingForTarget,
  percentage,
  receiptAmounts,
  ticketGoalState,
  totalReward,
  type OperatorType,
  type RewardTier,
} from "./goalRules";

export type BranchMetricSnapshot = Partial<{
  portfolioTotal: number | null;
  monthOpening: number | null;
  dayOpening: number | null;
  currentOverdue: number | null;
  creditGoal: number | null;
  challengeGoal: number | null;
  lostGoal: number | null;
  lostReceived: number | null;
  workingDaysTotal: number | null;
  workingDaysElapsed: number | null;
  ticketWorkingDaysRemaining: number | null;
  fiadoAtDay15: boolean | null;
  monthlyLoss: number | null;
  lossSalesPercent: number | null;
}>;

type NumericBranchMetric = Exclude<keyof BranchMetricSnapshot, "fiadoAtDay15">;

export function resolveBranchOverviewMetrics(
  operatorMetrics?: BranchMetricSnapshot | null,
  branchDefaults?: BranchMetricSnapshot | null,
) {
  const value = (field: NumericBranchMetric) => Number(operatorMetrics?.[field] ?? branchDefaults?.[field] ?? 0);

  return {
    portfolioTotal: value("portfolioTotal"),
    monthOpening: value("monthOpening"),
    dayOpening: value("dayOpening"),
    currentOverdue: value("currentOverdue"),
    creditGoal: value("creditGoal"),
    challengeGoal: value("challengeGoal"),
    lostGoal: value("lostGoal"),
    lostReceived: value("lostReceived"),
    workingDaysTotal: value("workingDaysTotal"),
    workingDaysElapsed: value("workingDaysElapsed"),
    ticketWorkingDaysRemaining: value("ticketWorkingDaysRemaining"),
    fiadoAtDay15: Boolean(operatorMetrics?.fiadoAtDay15 ?? branchDefaults?.fiadoAtDay15 ?? false),
    monthlyLoss: value("monthlyLoss"),
    lossSalesPercent: value("lossSalesPercent"),
  };
}

export type BranchOverviewMetrics = ReturnType<typeof resolveBranchOverviewMetrics>;

export function latestOverviewUpdate(...values: Array<Date | null | undefined>) {
  const latestTimestamp = values.reduce<number | null>((latest, value) => {
    if (!value) return latest;
    const timestamp = value.getTime();
    if (!Number.isFinite(timestamp)) return latest;
    return latest === null || timestamp > latest ? timestamp : latest;
  }, null);

  return latestTimestamp === null ? null : new Date(latestTimestamp);
}

export function hasBranchFinancialActivity(metrics: BranchMetricSnapshot) {
  const fields: Array<keyof BranchMetricSnapshot> = [
    "portfolioTotal",
    "monthOpening",
    "dayOpening",
    "currentOverdue",
    "creditGoal",
    "challengeGoal",
    "lostGoal",
    "lostReceived",
  ];

  return fields.some(field => Number(metrics[field] ?? 0) !== 0);
}

function nextRewardTier(tiers: RewardTier[], progress: number) {
  return tiers.find(tier => progress < tier.target) ?? null;
}

export function getBranchPerformance(operatorType: OperatorType | null, metrics: BranchOverviewMetrics, referenceDate?: Date) {
  const receipts = receiptAmounts(metrics.monthOpening, metrics.dayOpening, metrics.currentOverdue);
  const receivableAmount = amountReceivable(metrics.monthOpening, metrics.creditGoal);
  const fiadoProgress = fiadoPercentage(metrics.creditGoal, metrics.currentOverdue);
  const challengeProgress = challengePercentage(metrics.challengeGoal, metrics.currentOverdue);
  const fiadoTiers = operatorType ? FIADO_TIERS[operatorType] : [];
  const challengeTiers = operatorType ? CHALLENGE_TIERS[operatorType] : [];
  const fiadoNext = nextRewardTier(fiadoTiers, fiadoProgress);
  const challengeNext = nextRewardTier(challengeTiers, challengeProgress);
  const ticket = operatorType === "leader"
    ? ticketGoalState({
        receivedAccumulated: receipts.accumulated,
        receivableAmount,
        workingDaysRemaining: metrics.ticketWorkingDaysRemaining,
        reachedByDay15: metrics.fiadoAtDay15,
        referenceDate,
      })
    : null;
  const lostProgress = percentage(metrics.lostReceived, metrics.lostGoal);
  const fiadoReward = accumulatedReward(fiadoTiers, fiadoProgress);
  const challengeReward = accumulatedReward(challengeTiers, challengeProgress);
  const ticketReward = ticket?.status === "achieved" ? 100 : 0;
  const lostReward = metrics.lostGoal > 0 ? accumulatedReward(LOST_TIERS, lostProgress) : 0;
  const totalPossibleReward = operatorType
    ? totalReward(fiadoTiers) + totalReward(challengeTiers) + (operatorType === "leader" ? 100 : 0) + (metrics.lostGoal > 0 ? totalReward(LOST_TIERS) : 0)
    : null;

  return {
    receipts,
    receivableAmount,
    delinquency: delinquencyPercentage(metrics.currentOverdue, metrics.portfolioTotal),
    fiado: {
      progress: fiadoProgress,
      reward: fiadoReward,
      nextTarget: fiadoNext?.target ?? null,
      missingForNext: fiadoNext ? fiadoMissingForTarget(fiadoNext.target, metrics.creditGoal, metrics.currentOverdue) : 0,
      missingFor100: fiadoMissingForTarget(100, metrics.creditGoal, metrics.currentOverdue),
    },
    challenge: {
      progress: challengeProgress,
      reward: challengeReward,
      nextTarget: challengeNext?.target ?? null,
      missingForNext: challengeNext ? challengeMissingForTarget(challengeNext.target, metrics.challengeGoal, metrics.currentOverdue) : 0,
      missingFor100: challengeMissingForTarget(100, metrics.challengeGoal, metrics.currentOverdue),
    },
    ticket,
    lost: {
      enabled: metrics.lostGoal > 0,
      progress: lostProgress,
      reward: lostReward,
      missingFor100: lostGoalMissingForTarget(100, metrics.lostGoal, metrics.lostReceived),
      missingFor105: lostGoalMissingForTarget(105, metrics.lostGoal, metrics.lostReceived),
    },
    totalReward: operatorType ? fiadoReward + challengeReward + ticketReward + lostReward : null,
    totalPossibleReward,
  };
}
