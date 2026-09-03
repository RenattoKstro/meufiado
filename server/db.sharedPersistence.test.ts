import { describe, expect, it, vi } from "vitest";
import { completeMyProfile, getBranchSlotAvailability, getMyMetrics, listActiveBranchesWithSlots, saveMyMetrics } from "./db";

const updatedMetrics = {
  portfolioTotal: 350000,
  monthOpening: 95000,
  dayOpening: 73000,
  currentOverdue: 58000,
  creditGoal: 52000,
  challengeGoal: 31000,
  lostGoal: 1200,
  lostReceived: 680,
  workingDaysTotal: 22,
  workingDaysElapsed: 9,
  ticketWorkingDaysRemaining: 2,
  manualHolidayDates: ["2026-09-07"],
  fiadoAtDay15: false,
};

function withQueuedSelections(entries: Array<() => unknown[]>) {
  return {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async () => entries.shift()?.() ?? [],
        }),
      }),
    })),
  };
}

describe("helpers reais de vagas por filial", () => {
  it("expõe ao cadastro somente a função ainda livre em cada filial", async () => {
    const activeBranches = [
      { id: 77, name: "Filial Centro", code: "77", regional: "Norte", isActive: true },
      { id: 78, name: "Filial Sul", code: "78", regional: "Sul", isActive: true },
    ];
    let queryIndex = 0;
    const database = {
      select: () => ({
        from: () => ({
          where: () => {
            const current = queryIndex++;
            if (current === 0) return { orderBy: async () => activeBranches };
            return Promise.resolve(current === 1 ? [{ operatorType: "leader" }] : [{ operatorType: "leader" }, { operatorType: "assistant" }]);
          },
        }),
      }),
    };

    await expect(listActiveBranchesWithSlots(database as never)).resolves.toEqual([
      expect.objectContaining({ id: 77, availableSlots: { leader: false, assistant: true } }),
      expect.objectContaining({ id: 78, availableSlots: { leader: false, assistant: false } }),
    ]);
  });

  it("calcula a vaga restante a partir das funções ocupadas retornadas pelo banco", async () => {
    const database = {
      select: () => ({
        from: () => ({
          where: async () => [{ operatorType: "leader" }],
        }),
      }),
    };

    await expect(getBranchSlotAvailability(77, database as never)).resolves.toEqual({ leader: true, assistant: false });
  });

  it("bloqueia a conclusão real quando já existe outro Líder na filial", async () => {
    const database = withQueuedSelections([
      () => [{ id: 10 }],
      () => [],
      () => [{ id: 11 }],
    ]);

    await expect(completeMyProfile(100, { fullName: "Novo Líder", email: "novo@example.com", branchId: 77, phone: "11999999999", operatorType: "leader" }, database as never))
      .rejects.toThrow("vaga de Operador Líder");
  });
});

describe("helpers reais de métricas compartilhadas", () => {
  it("grava pelo branchId do Líder e devolve a mesma linha ao Auxiliar da filial", async () => {
    const state: { metrics: Record<string, unknown> } = { metrics: { fiadoAtDay15: false } };
    const selections: Array<() => unknown[]> = [
      () => [{ branchId: 77 }],
      () => [{ fiadoAtDay15: false }],
      () => [{ branchId: 77 }],
      () => [state.metrics],
    ];
    const inserted: Record<string, unknown>[] = [];
    const database = {
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            limit: async () => selections.shift()?.() ?? [],
          }),
        }),
      })),
      insert: vi.fn(() => ({
        values: (values: Record<string, unknown>) => ({
          onDuplicateKeyUpdate: async ({ set }: { set: Record<string, unknown> }) => {
            inserted.push(values);
            state.metrics = { ...state.metrics, ...values, ...set };
          },
        }),
      })),
    };

    await saveMyMetrics(100, updatedMetrics, database as never);
    const assistantMetrics = await getMyMetrics(101, database as never);

    expect(inserted).toEqual([expect.objectContaining({ branchId: 77, currentOverdue: 58000, lostReceived: 680, manualHolidayDatesJson: '["2026-09-07"]' })]);
    expect(assistantMetrics).toEqual(expect.objectContaining({ currentOverdue: 58000, lostReceived: 680, manualHolidayDates: ["2026-09-07"] }));
  });
});
