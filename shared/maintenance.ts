export type MaintenanceUserRole = "admin" | "user" | null | undefined;

/**
 * O modo de manutenção é uma barreira operacional para operadores comuns.
 * Administradores precisam permanecer no sistema para desativá-lo ou corrigi-lo.
 */
export function shouldShowMaintenance(enabled: boolean, role: MaintenanceUserRole) {
  return enabled && role !== "admin";
}
