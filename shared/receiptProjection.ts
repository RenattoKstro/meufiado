export type ReceiptProjectionInput = {
  historyTotalReceived: number;
  historyDaysRecorded: number;
  fallbackTotalReceived: number;
  workingDaysElapsed: number;
  workingDaysRemaining: number;
  remainingToReceive: number;
};

export type ReceiptProjection = {
  source: "daily-history" | "dashboard-total";
  totalReceived: number;
  daysBase: number;
  averagePerDay: number;
  daysRemaining: number;
  remainingToReceive: number;
  dailyNeeded: number;
  projectedReceived: number;
  projectedCollectionRate: number;
  targetReceived: number;
  weightedDaysRemaining: number;
};

const nonNegative = (value: number) => Number.isFinite(value) ? Math.max(value, 0) : 0;

/**
 * Projeta o total mensal recebido pela média dos registros diários. O saldo
 * informado deve corresponder ao necessário para atingir a Meta Fiado, e não
 * a todo o vencido em aberto. A projeção reduz o peso dos três últimos dias
 * úteis e possui teto de 101% da meta, evitando extrapolações irreais.
 */
export function receiptProjection(input: ReceiptProjectionInput): ReceiptProjection {
  const useDailyHistory = nonNegative(input.historyDaysRecorded) > 0;
  const totalReceived = useDailyHistory ? nonNegative(input.historyTotalReceived) : nonNegative(input.fallbackTotalReceived);
  const daysBase = useDailyHistory ? Math.floor(nonNegative(input.historyDaysRecorded)) : Math.floor(nonNegative(input.workingDaysElapsed));
  const daysRemaining = Math.floor(nonNegative(input.workingDaysRemaining));
  const remainingToReceive = nonNegative(input.remainingToReceive);
  const averagePerDay = daysBase > 0 ? totalReceived / daysBase : 0;
  const targetReceived = totalReceived + remainingToReceive;
  const finalDays = Math.min(daysRemaining, 3);
  const weightedDaysRemaining = Math.max(daysRemaining - finalDays, 0) + finalDays * 0.7;
  const maxForecastReceived = targetReceived * 1.01;
  const projectedReceived = Math.min(totalReceived + averagePerDay * weightedDaysRemaining, maxForecastReceived);
  const projectedCollectionRate = targetReceived > 0 ? projectedReceived / targetReceived * 100 : 0;

  return {
    source: useDailyHistory ? "daily-history" : "dashboard-total",
    totalReceived,
    daysBase,
    averagePerDay,
    daysRemaining,
    remainingToReceive,
    dailyNeeded: daysRemaining > 0 ? remainingToReceive / daysRemaining : remainingToReceive,
    projectedReceived,
    projectedCollectionRate,
    targetReceived,
    weightedDaysRemaining,
  };
}
