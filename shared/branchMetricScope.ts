export type MetricStorageScope =
  | { type: "branch"; branchId: number }
  | { type: "legacy-user"; userId: number };

export function resolveMetricStorageScope(userId: number, branchId: number | null | undefined): MetricStorageScope {
  return typeof branchId === "number" && branchId > 0
    ? { type: "branch", branchId }
    : { type: "legacy-user", userId };
}
