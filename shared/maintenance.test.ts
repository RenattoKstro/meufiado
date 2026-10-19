import { describe, expect, it } from "vitest";
import { shouldShowMaintenance } from "./maintenance";

describe("modo de manutenção", () => {
  it("bloqueia usuários normais quando está ativo", () => {
    expect(shouldShowMaintenance(true, "user")).toBe(true);
  });

  it("mantém o administrador no painel para desativar a manutenção", () => {
    expect(shouldShowMaintenance(true, "admin")).toBe(false);
  });

  it("não bloqueia quando a manutenção está desativada", () => {
    expect(shouldShowMaintenance(false, "user")).toBe(false);
    expect(shouldShowMaintenance(false, null)).toBe(false);
  });
});
