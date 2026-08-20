// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const profileMine = vi.hoisted(() => vi.fn());
const metricsMine = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trpc", () => ({
  trpc: {
    profile: {
      mine: { useQuery: profileMine },
      preferences: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
    metrics: {
      mine: { useQuery: metricsMine },
      save: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 4101, role: "admin", name: "Administradora" } }),
}));

import Dashboard from "./Dashboard";
import { MetricsSettings } from "./Settings";

const emptyQuery = { data: null, isLoading: false, isError: false };

describe("páginas operacionais para administrador sem filial", () => {
  afterEach(cleanup);

  it.each([
    ["Visão geral", "overview"],
    ["Meta Fiado", "fiado"],
    ["Meta Desafio", "challenge"],
  ] as const)("exibe estado administrativo seguro em %s", (title, view) => {
    profileMine.mockReturnValue(emptyQuery);
    metricsMine.mockReturnValue(emptyQuery);

    render(<Dashboard view={view} />);

    expect(screen.getByText("Modo administrador")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(/não está vinculada a uma filial/i)).toBeInTheDocument();
  });

  it("exibe um estado seguro em Ajustes sem tentar salvar métricas", () => {
    profileMine.mockReturnValue(emptyQuery);
    metricsMine.mockReturnValue(emptyQuery);

    render(<MetricsSettings />);

    expect(screen.getByText("Modo administrador")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ajustes de metas" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /salvar ajustes/i })).not.toBeInTheDocument();
  });
});
