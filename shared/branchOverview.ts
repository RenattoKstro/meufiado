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
}>;

export function resolveBranchOverviewMetrics(
  operatorMetrics?: BranchMetricSnapshot | null,
  branchDefaults?: BranchMetricSnapshot | null,
) {
  const value = (field: keyof BranchMetricSnapshot) => operatorMetrics?.[field] ?? branchDefaults?.[field] ?? 0;

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
  };
}

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
