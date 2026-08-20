export type SearchableBranchOverview = {
  branch: { name: string; code: string | null; regional: string | null };
  operator: { fullName: string } | null;
};

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function compact(value: string) {
  return value.replace(/[^a-z0-9]/g, "");
}

export function filterBranchOverviewsBySearch<T extends SearchableBranchOverview>(items: T[], query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return items;
  const compactQuery = compact(normalizedQuery);

  return items.filter(item => [item.branch.name, item.branch.code, item.branch.regional, item.operator?.fullName]
    .filter((value): value is string => Boolean(value))
    .some(value => {
      const normalizedValue = normalizeSearchValue(value);
      return normalizedValue.includes(normalizedQuery) || (compactQuery.length > 0 && compact(normalizedValue).includes(compactQuery));
    }));
}

export function getBranchRegionals<T extends SearchableBranchOverview>(items: T[]) {
  return Array.from(new Set(items
    .map(item => item.branch.regional?.trim())
    .filter((regional): regional is string => Boolean(regional))
  )).sort((first, second) => first.localeCompare(second, "pt-BR"));
}

export function filterBranchOverviewsByRegional<T extends SearchableBranchOverview>(items: T[], regional: string) {
  const normalizedRegional = normalizeSearchValue(regional);
  if (!normalizedRegional || normalizedRegional === "all") return items;
  return items.filter(item => normalizeSearchValue(item.branch.regional ?? "") === normalizedRegional);
}
