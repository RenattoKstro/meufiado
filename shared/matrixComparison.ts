import { normalizeBranchCode } from "./importRules";

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
