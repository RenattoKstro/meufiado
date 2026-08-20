// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const generalQuery = vi.hoisted(() => vi.fn());
const markRead = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ chat: { general: { invalidate: vi.fn() }, private: { invalidate: vi.fn() }, unreadCount: { invalidate: vi.fn() } } }),
    chat: {
      general: { useQuery: generalQuery },
      private: { useQuery: vi.fn() },
      send: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      markRead: { useMutation: () => ({ mutate: markRead, isPending: false }) },
    },
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 9, role: "user", name: "Operador" } }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/chat", vi.fn()] }));

import Chat from "./Chat";

describe("apresentação do chat", () => {
  afterEach(cleanup);

  it("destaca administradores e alinha mensagens recebidas e enviadas em lados opostos", () => {
    generalQuery.mockReturnValue({
      data: [
        { message: { id: 1, body: "Mensagem da administração", expiresAt: new Date("2030-01-01T10:00:00Z") }, sender: "Renato", senderId: 1, senderRole: "admin" },
        { message: { id: 2, body: "Minha resposta", expiresAt: new Date("2030-01-01T10:05:00Z") }, sender: "Operador", senderId: 9, senderRole: "user" },
      ],
      isLoading: false,
      isError: false,
    });

    render(<Chat />);

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Você")).toBeInTheDocument();
    expect(screen.getByText("Mensagem da administração").closest("article")).toHaveClass("justify-start");
    expect(screen.getByText("Minha resposta").closest("article")).toHaveClass("justify-end");
    expect(markRead).toHaveBeenCalled();
  });
});
