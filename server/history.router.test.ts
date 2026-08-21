import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { createAppRouter } from "./routers";

const listHistory = vi.fn();
const createHistory = vi.fn();
const updateHistory = vi.fn();
const deleteHistory = vi.fn();

function historyContext(): TrpcContext {
  return {
    user: {
      id: 77,
      openId: "history-operator",
      email: "operador@example.com",
      name: "Operadora Históricos",
      loginMethod: "google",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("history router", () => {
  const caller = () => createAppRouter({
    listReceiptHistory: listHistory,
    createReceiptHistoryEntry: createHistory,
    updateReceiptHistoryEntry: updateHistory,
    deleteReceiptHistoryEntry: deleteHistory,
    canAccessSubscriptionFeature: async () => true,
  }).createCaller(historyContext());

  beforeEach(() => {
    listHistory.mockReset().mockResolvedValue({ month: "2026-08", entries: [], totalReceived: 0, daysRecorded: 0, averagePerDay: 0 });
    createHistory.mockReset().mockResolvedValue(undefined);
    updateHistory.mockReset().mockResolvedValue(undefined);
    deleteHistory.mockReset().mockResolvedValue(undefined);
  });

  it("consulta apenas o mês solicitado no escopo do operador autenticado", async () => {
    await caller().history.list({ month: "2026-08" });

    expect(listHistory).toHaveBeenCalledWith(77, "2026-08");
  });

  it("encaminha a criação, edição e exclusão para o usuário autenticado", async () => {
    const data = { entryDate: "2026-08-21", receivedAmount: 1250.5 };
    const api = caller();

    await api.history.create(data);
    await api.history.update({ id: 15, data });
    await api.history.delete({ id: 15 });

    expect(createHistory).toHaveBeenCalledWith(77, data);
    expect(updateHistory).toHaveBeenCalledWith(77, 15, data);
    expect(deleteHistory).toHaveBeenCalledWith(77, 15);
  });

  it("recusa meses e datas fora do formato de calendário", async () => {
    const api = caller();

    await expect(api.history.list({ month: "08/2026" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(api.history.create({ entryDate: "21/08/2026", receivedAmount: 10 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
