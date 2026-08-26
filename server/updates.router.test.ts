import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listUpdateNotes: vi.fn(),
  countUnreadUpdateNotes: vi.fn(),
  markUpdateNotesRead: vi.fn(),
  createUpdateNote: vi.fn(),
  updateUpdateNote: vi.fn(),
  deleteUpdateNote: vi.fn(),
}));

vi.mock("./db", async importActual => ({ ...(await importActual<typeof import("./db")>()), ...dbMocks }));

import { createAppRouter } from "./routers";

function contextFor(role: "user" | "admin"): TrpcContext {
  return {
    user: { id: 53, openId: "updates-test", email: "atualizacoes@example.com", name: "Pessoa de teste", loginMethod: "google", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { header: () => undefined } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("procedures de atualizações", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite consultar e confirmar a leitura do histórico para qualquer usuário autenticado", async () => {
    const note = { id: 8, title: "Nova melhoria", description: "Descrição", category: "Geral", isVisible: true, createdAt: new Date(), updatedAt: new Date() };
    dbMocks.listUpdateNotes.mockResolvedValue([note]);
    dbMocks.countUnreadUpdateNotes.mockResolvedValue(2);
    dbMocks.markUpdateNotesRead.mockResolvedValue({ lastReadUpdateId: 8 });
    const caller = createAppRouter().createCaller(contextFor("user"));

    await expect(caller.updates.list()).resolves.toEqual([note]);
    await expect(caller.updates.unreadCount()).resolves.toBe(2);
    await expect(caller.updates.markRead()).resolves.toEqual({ lastReadUpdateId: 8 });
    expect(dbMocks.listUpdateNotes).toHaveBeenCalledWith(false);
    expect(dbMocks.countUnreadUpdateNotes).toHaveBeenCalledWith(53);
    expect(dbMocks.markUpdateNotesRead).toHaveBeenCalledWith(53);
  });

  it("restringe a edição do histórico ao administrador", async () => {
    const user = createAppRouter().createCaller(contextFor("user"));
    await expect(user.updatesAdmin.create({ title: "Bloqueado", description: "Sem acesso", category: "Geral", isVisible: true })).rejects.toMatchObject({ code: "FORBIDDEN" });

    dbMocks.createUpdateNote.mockResolvedValue({ id: 9 });
    dbMocks.updateUpdateNote.mockResolvedValue({ id: 9 });
    dbMocks.deleteUpdateNote.mockResolvedValue({ id: 9 });
    const admin = createAppRouter().createCaller(contextFor("admin"));
    await admin.updatesAdmin.create({ title: "Novo recurso", description: "Disponível", category: "Utilidades", isVisible: true });
    await admin.updatesAdmin.update({ id: 9, title: "Novo recurso", description: "Atualizado", category: "Utilidades", isVisible: false });
    await admin.updatesAdmin.delete({ id: 9 });
    expect(dbMocks.createUpdateNote).toHaveBeenCalledWith(expect.objectContaining({ title: "Novo recurso", isVisible: true }), 53);
    expect(dbMocks.updateUpdateNote).toHaveBeenCalledWith(9, expect.objectContaining({ description: "Atualizado", isVisible: false }));
    expect(dbMocks.deleteUpdateNote).toHaveBeenCalledWith(9);
  });
});
