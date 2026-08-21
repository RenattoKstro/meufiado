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
};

const nonNegative = (value: number) => Number.isFinite(value) ? Math.max(value, 0) : 0;

/**
 * Projeta o total mensal recebido pela média dos registros diários. Sem
 * histórico, usa o total acumulado do painel e os dias úteis transcorridos.
 */
export function receiptProjection(input: ReceiptProjectionInput): ReceiptProjection {
  const useDailyHistory = nonNegative(input.historyDaysRecorded) > 0;
  const totalReceived = useDailyHistory ? nonNegative(input.historyTotalReceived) : nonNegative(input.fallbackTotalReceived);
  const daysBase = useDailyHistory ? Math.floor(nonNegative(input.historyDaysRecorded)) : Math.floor(nonNegative(input.workingDaysElapsed));
  const daysRemaining = Math.floor(nonNegative(input.workingDaysRemaining));
  const remainingToReceive = nonNegative(input.remainingToReceive);
  const averagePerDay = daysBase > 0 ? totalReceived / daysBase : 0;
  const maximumCollectable = totalReceived + remainingToReceive;
  const projectedReceived = Math.min(totalReceived + averagePerDay * daysRemaining, maximumCollectable);
  const projectedCollectionRate = maximumCollectable > 0 ? projectedReceived / maximumCollectable * 100 : 0;

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
  };
}
