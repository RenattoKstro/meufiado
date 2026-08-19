import { describe, expect, it } from "vitest";
import { resolveMetricStorageScope } from "./branchMetricScope";
import { assertOperatorSlotAvailable, deriveBranchSlotAvailability } from "./branchSlots";

describe("vagas compartilhadas por filial", () => {
  it("identifica as funções já ocupadas e mantém disponível apenas a vaga restante", () => {
    expect(deriveBranchSlotAvailability(["leader"])).toEqual({ leader: true, assistant: false });
    expect(deriveBranchSlotAvailability(["leader", "assistant"])).toEqual({ leader: true, assistant: true });
  });

  it("bloqueia o cadastro de uma segunda pessoa na mesma função", () => {
    expect(() => assertOperatorSlotAvailable(["leader"], "leader")).toThrow("vaga de Operador Líder");
    expect(() => assertOperatorSlotAvailable(["leader"], "assistant")).not.toThrow();
  });
});

describe("métricas compartilhadas por filial", () => {
  it("atribui Líder e Auxiliar da mesma filial à mesma chave de métricas", () => {
    expect(resolveMetricStorageScope(10, 77)).toEqual({ type: "branch", branchId: 77 });
    expect(resolveMetricStorageScope(11, 77)).toEqual({ type: "branch", branchId: 77 });
  });

  it("mantém o caminho legado por usuário somente antes do vínculo com uma filial", () => {
    expect(resolveMetricStorageScope(10, null)).toEqual({ type: "legacy-user", userId: 10 });
  });
});
