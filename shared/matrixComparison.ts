import { normalizeBranchCode } from "./importRules";

export type MatrixSortOption = "numeric" | "creditEffectivenessDesc" | "creditEffectivenessAsc" | "challengeEffectivenessDesc" | "challengeEffectivenessAsc" | "ticketPercentDesc";

type ComparableMatrixItem = {
  branch: { id: number; code: string | null };
  metrics: {
    creditEffectivenessPercent: number;
    challengeEffectivenessPercent: number;
    ticketPercent: number;
  } | null;
};

export function comparisonCodesFromSearch(value: string, limit = 4) {
  return Array.from(new Set(
    value
      .split(",")
      .map(code => normalizeBranchCode(code))
      .filter((code): code is string => Boolean(code)),
  )).slice(0, limit);
}

export function sortMatrixItemsByComparisonCodes<T extends { branch: { code: string | null } }>(items: T[], codes: string[]) {
  const positionByCode = new Map(codes.map((code, index) => [code, index]));
  return items
    .filter(item => item.branch.code && positionByCode.has(normalizeBranchCode(item.branch.code)))
    .sort((first, second) => (positionByCode.get(normalizeBranchCode(first.branch.code)!) ?? 0) - (positionByCode.get(normalizeBranchCode(second.branch.code)!) ?? 0));
}

export function sortMatrixItemsForDisplay<T extends ComparableMatrixItem>(items: T[], option: MatrixSortOption) {
  const byCode = (first: T, second: T) => (first.branch.code ?? "").localeCompare(second.branch.code ?? "", "pt-BR", { numeric: true });
  const byMetric = (selector: (item: T) => number, direction: 1 | -1) => (first: T, second: T) => {
    const difference = selector(first) - selector(second);
    return difference === 0 ? byCode(first, second) : difference * direction;
  };

  const itemsCopy = [...items];
  if (option === "creditEffectivenessDesc") return itemsCopy.sort(byMetric(item => item.metrics?.creditEffectivenessPercent ?? Number.NEGATIVE_INFINITY, -1));
  if (option === "creditEffectivenessAsc") return itemsCopy.sort(byMetric(item => item.metrics?.creditEffectivenessPercent ?? Number.POSITIVE_INFINITY, 1));
  if (option === "challengeEffectivenessDesc") return itemsCopy.sort(byMetric(item => item.metrics?.challengeEffectivenessPercent ?? Number.NEGATIVE_INFINITY, -1));
  if (option === "challengeEffectivenessAsc") return itemsCopy.sort(byMetric(item => item.metrics?.challengeEffectivenessPercent ?? Number.POSITIVE_INFINITY, 1));
  if (option === "ticketPercentDesc") return itemsCopy.sort(byMetric(item => item.metrics?.ticketPercent ?? Number.NEGATIVE_INFINITY, -1));
  return itemsCopy.sort(byCode);
}

export type ComparisonEffectivenessHighlight = "best" | "worst";

export function comparisonEffectivenessHighlights<T extends ComparableMatrixItem>(items: T[]): ReadonlyMap<number, ComparisonEffectivenessHighlight> {
  const comparable = items.filter(item => item.metrics !== null && Number.isFinite(item.metrics.creditEffectivenessPercent));
  if (comparable.length < 2) return new Map();
  const values = comparable.map(item => item.metrics!.creditEffectivenessPercent);
  const best = Math.max(...values);
  const worst = Math.min(...values);
  if (best === worst) return new Map();
  const highlights = new Map<number, ComparisonEffectivenessHighlight>();
  for (const item of comparable) {
    if (item.metrics!.creditEffectivenessPercent === best) highlights.set(item.branch.id, "best");
    if (item.metrics!.creditEffectivenessPercent === worst) highlights.set(item.branch.id, "worst");
  }
  return highlights;
}
