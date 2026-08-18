export type BranchImportRow = { code: string; regional: string; name: string };

export type AnalyticImportRow = {
  code: string;
  regional: string;
  creditGoal: number;
  challengeGoal: number;
  currentOverdue: number;
  monthlyLoss: number;
  lossSalesPercent: number;
  lostGoal: number;
  lostReceived: number;
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
    currentOverdue: spreadsheetNumber(row[8]),
    monthlyLoss: spreadsheetNumber(row[17]),
    lossSalesPercent: spreadsheetNumber(row[18]),
    lostGoal: spreadsheetNumber(row[19]),
    lostReceived: spreadsheetNumber(row[20]),
  };
}

export function uniqueRowsByBranchCode<T extends { code: string }>(rows: T[]) {
  const unique = new Map<string, T>();
  rows.forEach(row => { if (!unique.has(row.code)) unique.set(row.code, row); });
  return Array.from(unique.values());
}
