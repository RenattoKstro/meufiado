// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const configState: { data?: { clientId: string }; isLoading: boolean; isError: boolean } = { data: { clientId: "teste.apps.googleusercontent.com" }, isLoading: false, isError: false };
const initialize = vi.fn();
const renderButton = vi.fn();
const refresh = vi.fn();
const setLocation = vi.fn();
const mutateAsync = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    googleAuth: {
      config: { useQuery: () => configState },
      login: { useMutation: () => ({ mutateAsync }) },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ refresh }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/entrar", setLocation] }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import GoogleOperatorSignIn from "./GoogleOperatorSignIn";

describe("GoogleOperatorSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue({ success: true });
    configState.data = { clientId: "teste.apps.googleusercontent.com" };
    configState.isLoading = false;
    configState.isError = false;
    delete (window as unknown as { google?: unknown }).google;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document.getElementById("google-identity-services")?.remove();
  });

  it("substitui o estado de preparação pelo botão quando a biblioteca Google é carregada", async () => {
    render(<GoogleOperatorSignIn />);
    expect(screen.getByText("Preparando acesso Google…")).toBeInTheDocument();

    (window as unknown as { google?: unknown }).google = { accounts: { id: { initialize, renderButton } } };
    document.getElementById("google-identity-services")?.dispatchEvent(new Event("load"));

    await waitFor(() => expect(screen.queryByText("Preparando acesso Google…")).not.toBeInTheDocument());
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: "teste.apps.googleusercontent.com" }));
    expect(renderButton).toHaveBeenCalled();
    expect(screen.getByLabelText("Entrar com Google")).toBeInTheDocument();
  });

  it("exibe uma mensagem útil quando a biblioteca Google falha ao carregar", async () => {
    render(<GoogleOperatorSignIn />);
    document.getElementById("google-identity-services")?.dispatchEvent(new Event("error"));

    expect(await screen.findByText("Não foi possível carregar o acesso do Google. Tente novamente em instantes.")).toBeInTheDocument();
  });

  it("exibe uma mensagem útil quando o carregamento Google expira", async () => {
    vi.useFakeTimers();
    render(<GoogleOperatorSignIn />);

    await act(async () => { await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(screen.getByText("Não foi possível carregar o acesso do Google. Tente novamente em instantes.")).toBeInTheDocument();
  });

  it("envia a intenção de cadastro quando a autenticação parte da etapa de registro", async () => {
    render(<GoogleOperatorSignIn mode="register" />);
    (window as unknown as { google?: unknown }).google = { accounts: { id: { initialize, renderButton } } };
    document.getElementById("google-identity-services")?.dispatchEvent(new Event("load"));

    await waitFor(() => expect(initialize).toHaveBeenCalled());
    const [{ callback }] = initialize.mock.calls[0] as [{ callback: (response: { credential: string }) => Promise<void> }];
    await act(async () => { await callback({ credential: "token-de-cadastro" }); });

    expect(mutateAsync).toHaveBeenCalledWith({ credential: "token-de-cadastro", mode: "register" });
    expect(refresh).toHaveBeenCalled();
    expect(setLocation).toHaveBeenCalledWith("/");
  });
});
