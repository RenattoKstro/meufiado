// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

const profileMine = vi.hoisted(() => vi.fn());
const metricsMine = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trpc", () => ({
  trpc: {
    profile: { mine: { useQuery: profileMine }, preferences: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } },
    metrics: { mine: { useQuery: metricsMine }, save: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 9, role: "user" } }) }));
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ theme: "dark", palette: "ocean", setTheme: vi.fn(), setPalette: vi.fn() }) }));

import { MetricsSettings } from "./Settings";

describe("marcador de férias", () => {
  afterEach(cleanup);

  it("orienta que o período seja marcado para prevenir inativação por ausência", () => {
    profileMine.mockReturnValue({ data: { profile: { branchId: 3, isOnVacation: false } }, isLoading: false });
    metricsMine.mockReturnValue({ data: { portfolioTotal: 0, monthOpening: 0, dayOpening: 0, currentOverdue: 0, creditGoal: 0, challengeGoal: 0, lostGoal: 0, lostReceived: 0, workingDaysTotal: 0, workingDaysElapsed: 0, ticketWorkingDaysRemaining: 0, fiadoAtDay15: false }, isLoading: false });

    render(<MetricsSettings />);

    expect(screen.getByText("Estou de férias")).toBeInTheDocument();
    expect(screen.getByText(/não será inativado por falta de acesso/i)).toBeInTheDocument();
  });
});
