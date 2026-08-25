// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generalQuery = vi.hoisted(() => vi.fn());
const privateQuery = vi.hoisted(() => vi.fn());
const privateThreadsQuery = vi.hoisted(() => vi.fn());
const supportRecipientQuery = vi.hoisted(() => vi.fn());
const markRead = vi.hoisted(() => vi.fn());
const sendMessage = vi.hoisted(() => vi.fn());
const searchValue = vi.hoisted(() => ({ value: "" }));
const setLocation = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ chat: { general: { invalidate: vi.fn() }, private: { invalidate: vi.fn() }, unreadCount: { invalidate: vi.fn() } } }),
    chat: {
      general: { useQuery: generalQuery },
      private: { useQuery: privateQuery },
      privateThreads: { useQuery: privateThreadsQuery },
      supportRecipient: { useQuery: supportRecipientQuery },
      send: { useMutation: () => ({ mutate: sendMessage, isPending: false }) },
      markRead: { useMutation: () => ({ mutate: markRead, isPending: false }) },
    },
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 9, role: "user", name: "Operador" } }) }));
vi.mock("wouter", () => ({ useSearch: () => searchValue.value, useLocation: () => ["/chat", setLocation] }));

import Chat from "./Chat";

describe("apresentação do chat", () => {
  beforeEach(() => {
    searchValue.value = "";
    generalQuery.mockReset();
    privateQuery.mockReset();
    privateThreadsQuery.mockReturnValue({ data: [], isLoading: false });
    supportRecipientQuery.mockReturnValue({ data: { id: 41, name: "Renato", isOnline: true, availabilityLabel: "Disponível agora" }, isLoading: false });
    markRead.mockReset();
    sendMessage.mockReset();
  });
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

  it("usa a conversa privada quando a URL informa o perfil destinatário", () => {
    searchValue.value = "?perfil=41";
    privateQuery.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(<Chat />);

    expect(screen.getAllByText("Conversa privada").length).toBeGreaterThan(0);
    expect(privateQuery).toHaveBeenCalledWith({ recipientUserId: 41 }, { refetchInterval: 5_000 });
    expect(generalQuery).not.toHaveBeenCalled();
    const input = screen.getByPlaceholderText("Digite uma mensagem…");
    fireEvent.change(input, { target: { value: "Mensagem restrita" } });
    fireEvent.submit(input.closest("form")!);
    expect(sendMessage).toHaveBeenCalledWith({ body: "Mensagem restrita", recipientUserId: 41 });
  });

  it("lista as conversas privadas separadas do Chat geral", () => {
    generalQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
    privateThreadsQuery.mockReturnValue({ data: [{ recipientUserId: 41, recipientName: "Larissa", recipientRole: "user", lastMessageBody: "Mensagem reservada", lastMessageAt: new Date("2030-01-01T10:00:00Z") }], isLoading: false });

    render(<Chat />);

    expect(screen.getByText("Chats privados")).toBeInTheDocument();
    expect(screen.getByText("Larissa")).toBeInTheDocument();
    expect(screen.getByText("Mensagem reservada")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Larissa"));
    expect(setLocation).toHaveBeenCalledWith("/chat?perfil=41");
  });

  it("oferece respostas rápidas ao iniciar o atendimento privado com o administrador", () => {
    searchValue.value = "?perfil=41";
    privateQuery.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(<Chat />);

    const reply = "Como registrar o recebido diário?";
    fireEvent.click(screen.getByRole("button", { name: reply }));
    expect(screen.getByPlaceholderText("Digite uma mensagem…")).toHaveValue(reply);
  });
});
