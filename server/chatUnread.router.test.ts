import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ countUnreadChatMessages: vi.fn(), markChatMessagesRead: vi.fn(), canAccessSubscriptionFeature: vi.fn(), isAdministratorUser: vi.fn(), listChatMessages: vi.fn() }));
vi.mock("./db", async importActual => ({ ...(await importActual<typeof import("./db")>()), ...dbMocks }));

import { appRouter } from "./routers";

function contextFor(): TrpcContext {
  return { user: { id: 81, openId: "chat-unread", email: "operador@example.com", name: "Operador", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("notificações de chat", () => {
  it("entrega a quantidade de mensagens novas e registra a leitura para o usuário autenticado", async () => {
    dbMocks.countUnreadChatMessages.mockResolvedValue(4);
    dbMocks.markChatMessagesRead.mockResolvedValue(undefined);
    dbMocks.canAccessSubscriptionFeature.mockResolvedValue(true);
    const caller = appRouter.createCaller(contextFor());

    await expect(caller.chat.unreadCount()).resolves.toBe(4);
    await expect(caller.chat.markRead()).resolves.toBeUndefined();
    expect(dbMocks.countUnreadChatMessages).toHaveBeenCalledWith(81, { adminOnly: false });
    expect(dbMocks.markChatMessagesRead).toHaveBeenCalledWith(81);
  });

  it("mantém o chat geral bloqueado no Free, mas libera a conversa com administrador", async () => {
    dbMocks.canAccessSubscriptionFeature.mockResolvedValue(false);
    dbMocks.isAdministratorUser.mockResolvedValue(true);
    dbMocks.listChatMessages.mockResolvedValue([]);
    const caller = appRouter.createCaller(contextFor());

    await expect(caller.chat.general()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.chat.private({ recipientUserId: 1 })).resolves.toEqual([]);
    expect(dbMocks.isAdministratorUser).toHaveBeenCalledWith(1);
  });
});
