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

export type ReceiptDailyImportRow = {
  code: string;
  sales: number;
  dailyReceived: Array<number | null>;
};

export function normalizeBranchCode(value: unknown) {
  const raw = String(value ?? "").trim();
  const firstRegionalBranch = raw.match(/^01\.(\d+)$/);
  if (firstRegionalBranch) {
    return String(Number.parseInt(firstRegionalBranch[1], 10));
  }
  const digits = raw.replace(/\D/g, "");
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

/**
 * Mantém percentuais digitados como texto (ex.: "68,63%") e converte o valor
 * bruto do Excel quando a célula usa formatação de porcentagem (ex.: 0.6863).
 */
export function spreadsheetPercent(value: unknown) {
  const parsed = spreadsheetNumber(value);
  const wasWrittenWithPercentSymbol = typeof value === "string" && value.includes("%");
  return !wasWrittenWithPercentSymbol && Math.abs(parsed) > 0 && Math.abs(parsed) <= 1
    ? parsed * 100
    : parsed;
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
    delinquencyPercent: spreadsheetPercent(row[9]),
    creditEffectivenessPercent: spreadsheetPercent(row[10]),
    challengeEffectivenessPercent: spreadsheetPercent(row[11]),
    ticketGoal: spreadsheetNumber(row[13]),
    ticketPercent: spreadsheetPercent(row[14]),
    ticketBonus: spreadsheetNumber(row[15]),
    monthlyLoss: spreadsheetNumber(row[17]),
    lossSalesPercent: spreadsheetPercent(row[18]),
    lostGoal: spreadsheetNumber(row[19]),
    lostReceived: spreadsheetNumber(row[20]),
    lossEffectivenessPercent: spreadsheetPercent(row[21]),
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
    closingForecastPercent: spreadsheetPercent(row[16]),
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

/**
 * Aba Vencido_Dia: B = filial, C = vendas e, a cada bloco diário de sete colunas,
 * o valor "Vlr Rec. Dia" ocupa a 5ª posição. Assim, H, O, V... formam
 * os recebimentos dos dias 01 a 31.
 */
export function receiptDailyRowFromSpreadsheet(row: unknown[]): ReceiptDailyImportRow | null {
  const code = normalizeBranchCode(row[1]);
  if (!code) return null;
  const optionalReceipt = (value: unknown) => {
    if (value === null || value === undefined || value === false || String(value).trim() === "") return null;
    return spreadsheetNumber(value);
  };
  return {
    code,
    sales: spreadsheetNumber(row[2]),
    dailyReceived: Array.from({ length: 31 }, (_, index) => optionalReceipt(row[7 + index * 7])),
  };
}

export function uniqueRowsByBranchCode<T extends { code: string }>(rows: T[]) {
  const unique = new Map<string, T>();
  rows.forEach(row => { if (!unique.has(row.code)) unique.set(row.code, row); });
  return Array.from(unique.values());
}
