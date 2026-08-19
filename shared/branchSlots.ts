export const OPERATOR_ROLES = ["leader", "assistant"] as const;
export type OperatorRole = typeof OPERATOR_ROLES[number];

export type BranchSlotAvailability = Record<OperatorRole, boolean>;

export function deriveBranchSlotAvailability(occupiedRoles: Iterable<OperatorRole>): BranchSlotAvailability {
  const occupied = new Set(occupiedRoles);
  return { leader: occupied.has("leader"), assistant: occupied.has("assistant") };
}

export function assertOperatorSlotAvailable(occupiedRoles: Iterable<OperatorRole>, requestedRole: OperatorRole) {
  if (!new Set(occupiedRoles).has(requestedRole)) return;
  const label = requestedRole === "leader" ? "Operador Líder" : "Operador Auxiliar";
  throw new Error(`A vaga de ${label} desta filial já está preenchida.`);
}
