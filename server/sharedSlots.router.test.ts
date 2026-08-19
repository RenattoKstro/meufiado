import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const sharedMetrics = {
  portfolioTotal: 300000,
  monthOpening: 90000,
  dayOpening: 75000,
  currentOverdue: 62000,
  creditGoal: 50000,
  challengeGoal: 30000,
  lostGoal: 1000,
  lostReceived: 400,
  workingDaysTotal: 22,
  workingDaysElapsed: 8,
  ticketWorkingDaysRemaining: 3,
  fiadoAtDay15: false,
};

function contextFor(userId: number): TrpcContext {
  return {
    user: { id: userId, openId: `operator-${userId}`, email: `operator-${userId}@example.com`, name: "Operador", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("contratos de vagas e métricas compartilhadas", () => {
  const listBranches = vi.fn();
  const completeProfile = vi.fn();
  const getMetrics = vi.fn();
  const saveMetrics = vi.fn();

  beforeEach(() => {
    listBranches.mockReset();
    completeProfile.mockReset();
    getMetrics.mockReset();
    saveMetrics.mockReset();
  });

  it("expõe apenas a vaga restante para a filial escolhida", async () => {
    listBranches.mockResolvedValue([{ id: 21, name: "Filial Praça", code: "21", regional: "Centro", availableSlots: { leader: false, assistant: true } }]);
    const caller = createAppRouter({ listActiveBranchesWithSlots: listBranches }).createCaller(contextFor(1));

    await expect(caller.profile.branches()).resolves.toEqual([{ id: 21, name: "Filial Praça", code: "21", regional: "Centro", availableSlots: { leader: false, assistant: true } }]);
  });

  it("bloqueia o terceiro cadastro quando as duas responsabilidades já estão ocupadas", async () => {
    completeProfile.mockRejectedValue(new Error("A vaga de Operador Líder desta filial já está preenchida."));
    const caller = createAppRouter({ completeMyProfile: completeProfile }).createCaller(contextFor(3));

    await expect(caller.profile.complete({ fullName: "Terceiro Operador", email: "terceiro@example.com", branchId: 21, phone: "11999999999", operatorType: "leader" })).rejects.toThrow("vaga de Operador Líder");
  });

  it("entrega ao Auxiliar a mesma métrica salva pelo Líder da filial", async () => {
    let persisted = sharedMetrics;
    getMetrics.mockImplementation(async () => persisted);
    saveMetrics.mockImplementation(async (_userId, input) => { persisted = input; });
    const router = createAppRouter({ getMyMetrics: getMetrics, saveMyMetrics: saveMetrics });
    const leader = router.createCaller(contextFor(1));
    const assistant = router.createCaller(contextFor(2));
    const updated = { ...sharedMetrics, currentOverdue: 58000, lostReceived: 700 };

    await leader.metrics.save(updated);

    await expect(assistant.metrics.mine()).resolves.toEqual(updated);
    expect(saveMetrics).toHaveBeenCalledWith(1, updated);
  });
});
