import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ countUnreadChatMessages: vi.fn(), markChatMessagesRead: vi.fn() }));
vi.mock("./db", async importActual => ({ ...(await importActual<typeof import("./db")>()), ...dbMocks }));

import { appRouter } from "./routers";

function contextFor(): TrpcContext {
  return { user: { id: 81, openId: "chat-unread", email: "operador@example.com", name: "Operador", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("notificações de chat", () => {
  it("entrega a quantidade de mensagens novas e registra a leitura para o usuário autenticado", async () => {
    dbMocks.countUnreadChatMessages.mockResolvedValue(4);
    dbMocks.markChatMessagesRead.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(contextFor());

    await expect(caller.chat.unreadCount()).resolves.toBe(4);
    await expect(caller.chat.markRead()).resolves.toBeUndefined();
    expect(dbMocks.countUnreadChatMessages).toHaveBeenCalledWith(81);
    expect(dbMocks.markChatMessagesRead).toHaveBeenCalledWith(81);
  });
});
