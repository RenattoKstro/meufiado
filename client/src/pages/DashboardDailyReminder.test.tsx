// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const profileMine = vi.hoisted(() => vi.fn());
const metricsMine = vi.hoisted(() => vi.fn());
const subscriptionMine = vi.hoisted(() => vi.fn());
const historyList = vi.hoisted(() => vi.fn());
const dailyStatus = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trpc", () => ({
  trpc: {
    profile: { mine: { useQuery: profileMine } },
    metrics: { mine: { useQuery: metricsMine } },
    subscription: { mine: { useQuery: subscriptionMine } },
    history: { list: { useQuery: historyList }, dailyStatus: { useQuery: dailyStatus } },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth }));
vi.mock("@/contexts/AppTextContext", () => ({ useAppTexts: () => ({ overviewTitle: "Visão geral", overviewDescription: "Acompanhamento de metas." }) }));

import Dashboard from "./Dashboard";

describe("lembrete diário da Visão Geral", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("permite fechar o lembrete diário sem alterar o acesso aos cards", () => {
    useAuth.mockReturnValue({ user: { id: 7, role: "user" } });
    profileMine.mockReturnValue({ data: { profile: { branchId: 3, fullName: "Ana Silva", operatorType: "leader", isOnVacation: false, showLostGoal: false }, branch: { id: 3, name: "Filial 003" } }, isLoading: false });
    metricsMine.mockReturnValue({ data: { portfolioTotal: 200_000, monthOpening: 120_000, dayOpening: 90_000, currentOverdue: 85_000, creditGoal: 80_000, challengeGoal: 82_000, lostGoal: 0, lostReceived: 0, workingDaysTotal: 22, workingDaysElapsed: 10, ticketWorkingDaysRemaining: 2, fiadoAtDay15: false }, isLoading: false });
    subscriptionMine.mockReturnValue({ data: { isPro: false } });
    historyList.mockReturnValue({ data: { totalReceived: 0, daysRecorded: 0 }, isLoading: false });
    dailyStatus.mockReturnValue({ data: { hasBranch: true, hasEntry: false } });

    render(<Dashboard />);

    expect(screen.getByText(/lembrete diário/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar lembrete diário" }));
    expect(screen.queryByText(/lembrete diário/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Meta Fiado").length).toBeGreaterThan(0);
  });
});
