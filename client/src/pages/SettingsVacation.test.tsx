// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

const profileMine = vi.hoisted(() => vi.fn());
const metricsMine = vi.hoisted(() => vi.fn());
const subscriptionMine = vi.hoisted(() => vi.fn());
const autofillMutateAsync = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ message: vi.fn(), success: vi.fn(), error: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    profile: { mine: { useQuery: profileMine }, preferences: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } },
    metrics: { mine: { useQuery: metricsMine }, save: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }, autofillFromMatrix: { useMutation: () => ({ mutateAsync: autofillMutateAsync, isPending: false }) } },
    subscription: { mine: { useQuery: subscriptionMine } },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth }));
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ theme: "dark", palette: "ocean", setTheme: vi.fn(), setPalette: vi.fn() }) }));
vi.mock("sonner", () => ({ toast }));

import { MetricsSettings } from "./Settings";

describe("marcador de férias", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function mockSettings({ isPro }: { isPro: boolean }) {
    useAuth.mockReturnValue({ user: { id: 9, role: "user" } });
    profileMine.mockReturnValue({ data: { profile: { branchId: 3, isOnVacation: false } }, isLoading: false });
    metricsMine.mockReturnValue({ data: { portfolioTotal: 0, monthOpening: 0, dayOpening: 0, currentOverdue: 0, creditGoal: 0, challengeGoal: 0, lostGoal: 0, lostReceived: 0, workingDaysTotal: 0, workingDaysElapsed: 0, ticketWorkingDaysRemaining: 0, fiadoAtDay15: false }, isLoading: false });
    subscriptionMine.mockReturnValue({ data: { isPro }, isLoading: false });
  }

  it("orienta que o período seja marcado para prevenir inativação por ausência", () => {
    mockSettings({ isPro: false });

    render(<MetricsSettings />);

    expect(screen.getByText("Estou de férias")).toBeInTheDocument();
    expect(screen.getByText(/não será inativado por falta de acesso/i)).toBeInTheDocument();
  });

  it("mostra o botão para Free, orienta upgrade e não solicita dados da Matriz", () => {
    mockSettings({ isPro: false });
    render(<MetricsSettings />);

    fireEvent.click(screen.getByRole("button", { name: /preencher com a matriz/i }));

    expect(toast.message).toHaveBeenCalledWith("O preenchimento automático da Matriz está disponível para usuários PRO.", expect.objectContaining({ action: expect.objectContaining({ label: "Ver plano" }) }));
    expect(autofillMutateAsync).not.toHaveBeenCalled();
  });

  it("preenche somente os campos com origem na Matriz para conta PRO e aguarda salvar", async () => {
    mockSettings({ isPro: true });
    autofillMutateAsync.mockResolvedValue({ portfolioTotal: 500_000, monthOpening: 120_000, currentOverdue: 90_000, creditGoal: 75_000, challengeGoal: 80_000, lostGoal: 4_000, lostReceived: 2_500 });
    render(<MetricsSettings />);

    fireEvent.click(screen.getByRole("button", { name: /preencher com a matriz/i }));

    await waitFor(() => expect(autofillMutateAsync).toHaveBeenCalledOnce());
    expect(await screen.findByLabelText("Carteira total")).toHaveValue(500_000);
    expect(screen.getByLabelText("Abertura do dia")).toHaveValue(0);
    expect(toast.success).toHaveBeenCalledWith("Dados da Matriz carregados. Confirme em Salvar ajustes para aplicar.");
  });
});
