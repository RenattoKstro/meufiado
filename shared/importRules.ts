export type BranchImportRow = { code: string; regional: string; name: string };

export type AnalyticImportRow = {
  code: string;
  regional: string;
  creditGoal: number;
  challengeGoal: number;
  received: number;
  delinquencyPercent: number;
  creditEffectivenessPercent: number;
  challengeEffectivenessPercent: number;
  ticketGoal: number;
  ticketPercent: number;
  ticketBonus: number;
  monthlyLoss: number;
  lossSalesPercent: number;
  lostGoal: number;
  lostReceived: number;
  lossEffectivenessPercent: number;
};

export type DataImportRow = {
  code: string;
  regional: string;
  amountReceivable: number;
  overdueOpening: number;
  portfolioTotal: number;
  receiptForecast: number;
  closingForecast: number;
  closingForecastPercent: number;
  accumulatedLossGoal: number;
  accumulatedLossReceived: number;
  accumulatedLossBalance: number;
};

export type DailyTrackingImportRow = {
  code: string;
  previousDayGoal: number;
  received: number;
  previousDayDifference: number;
  accumulatedDifference: number;
  redesignedDailyGoal: number;
};

export type ChallengeDailyImportRow = {
  code: string;
  regional: string;
  dailyReceived: number[];
};

export function normalizeBranchCode(value: unknown) {
  const digits = String(value ?? "").trim().replace(/\D/g, "");
  if (!digits) return "";
  return String(Number.parseInt(digits, 10));
}

export function spreadsheetNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").replace(/[R$\s]/g, "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function branchRowFromSpreadsheet(row: unknown[]): BranchImportRow | null {
  const code = normalizeBranchCode(row[0]);
  const regional = String(row[1] ?? "").trim();
  const name = String(row[2] ?? "").trim();
  return code && name ? { code, regional, name } : null;
}

export function analyticRowFromSpreadsheet(row: unknown[]): AnalyticImportRow | null {
  const code = normalizeBranchCode(row[0]);
  if (!code) return null;
  return {
    code,
    regional: String(row[2] ?? "").trim(),
    creditGoal: spreadsheetNumber(row[6]),
    challengeGoal: spreadsheetNumber(row[7]),
    received: spreadsheetNumber(row[8]),
    delinquencyPercent: spreadsheetNumber(row[9]),
    creditEffectivenessPercent: spreadsheetNumber(row[10]),
    challengeEffectivenessPercent: spreadsheetNumber(row[11]),
    ticketGoal: spreadsheetNumber(row[13]),
    ticketPercent: spreadsheetNumber(row[14]),
    ticketBonus: spreadsheetNumber(row[15]),
    monthlyLoss: spreadsheetNumber(row[17]),
    lossSalesPercent: spreadsheetNumber(row[18]),
    lostGoal: spreadsheetNumber(row[19]),
    lostReceived: spreadsheetNumber(row[20]),
    lossEffectivenessPercent: spreadsheetNumber(row[21]),
  };
}

export function dataRowFromSpreadsheet(row: unknown[]): DataImportRow | null {
  const code = normalizeBranchCode(row[1]);
  if (!code) return null;
  return {
    code,
    regional: String(row[4] ?? "").trim(),
    amountReceivable: spreadsheetNumber(row[10]),
    overdueOpening: spreadsheetNumber(row[11]),
    portfolioTotal: spreadsheetNumber(row[12]),
    receiptForecast: spreadsheetNumber(row[14]),
    closingForecast: spreadsheetNumber(row[15]),
    closingForecastPercent: spreadsheetNumber(row[16]),
    accumulatedLossGoal: spreadsheetNumber(row[21]),
    accumulatedLossReceived: spreadsheetNumber(row[22]),
    accumulatedLossBalance: spreadsheetNumber(row[23]),
  };
}

export function dailyTrackingRowFromSpreadsheet(row: unknown[]): DailyTrackingImportRow | null {
  const code = normalizeBranchCode(row[0]);
  if (!code) return null;
  return {
    code,
    previousDayGoal: spreadsheetNumber(row[3]),
    received: spreadsheetNumber(row[4]),
    previousDayDifference: spreadsheetNumber(row[5]),
    accumulatedDifference: spreadsheetNumber(row[6]),
    redesignedDailyGoal: spreadsheetNumber(row[7]),
  };
}

export function challengeDailyRowFromSpreadsheet(row: unknown[]): ChallengeDailyImportRow | null {
  const code = normalizeBranchCode(row[0]);
  if (!code) return null;
  return {
    code,
    regional: String(row[1] ?? "").trim(),
    dailyReceived: Array.from({ length: 31 }, (_, index) => spreadsheetNumber(row[index + 2])),
  };
}

export function uniqueRowsByBranchCode<T extends { code: string }>(rows: T[]) {
  const unique = new Map<string, T>();
  rows.forEach(row => { if (!unique.has(row.code)) unique.set(row.code, row); });
  return Array.from(unique.values());
}
