// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const overviewQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trpc", () => ({
  trpc: { branches: { overview: { useQuery: overviewQuery } } },
}));

import Branches from "./Branches";

const metrics = {
  portfolioTotal: 100000,
  monthOpening: 50000,
  dayOpening: 40000,
  currentOverdue: 30000,
  creditGoal: 25000,
  challengeGoal: 15000,
  lostGoal: 0,
  lostReceived: 0,
  workingDaysTotal: 20,
  workingDaysElapsed: 7,
  ticketWorkingDaysRemaining: 3,
  fiadoAtDay15: false,
  monthlyLoss: 0,
  lossSalesPercent: 0,
};

describe("botão de pesquisa de Filiais", () => {
  afterEach(cleanup);

  it("aplica a busca digitada quando o usuário seleciona Pesquisar", () => {
    overviewQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { branch: { id: 1, name: "Douradina", code: "10002", regional: "MS" }, operator: null, metrics, updatedAt: new Date() },
        { branch: { id: 2, name: "Mundo Novo", code: "10003", regional: "MS" }, operator: null, metrics, updatedAt: new Date() },
      ],
    });

    render(<Branches />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Pesquisar filial" }), { target: { value: "Douradina" } });
    fireEvent.click(screen.getByRole("button", { name: "Pesquisar" }));

    expect(screen.getByText("Douradina")).toBeInTheDocument();
    expect(screen.queryByText("Mundo Novo")).not.toBeInTheDocument();
    expect(screen.getByText("1 resultado")).toBeInTheDocument();
  });

  it("também executa a busca ao pressionar Enter no campo", () => {
    overviewQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { branch: { id: 1, name: "Douradina", code: "10002", regional: "MS" }, operator: null, metrics, updatedAt: new Date() },
        { branch: { id: 2, name: "Mundo Novo", code: "10003", regional: "MS" }, operator: null, metrics, updatedAt: new Date() },
      ],
    });

    render(<Branches />);
    const field = screen.getByRole("searchbox", { name: "Pesquisar filial" });
    fireEvent.change(field, { target: { value: "Mundo Novo" } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(screen.getByText("Mundo Novo")).toBeInTheDocument();
    expect(screen.queryByText("Douradina")).not.toBeInTheDocument();
  });

  it("mantém o acesso de pesquisa identificado e filtra imediatamente durante a digitação", () => {
    overviewQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { branch: { id: 1, name: "Douradina", code: "10002", regional: "MS" }, operator: null, metrics, updatedAt: new Date() },
        { branch: { id: 2, name: "Mundo Novo", code: "10003", regional: "MS" }, operator: null, metrics, updatedAt: new Date() },
      ],
    });

    render(<Branches />);
    expect(screen.getByRole("search", { name: "" })).toBeInTheDocument();
    expect(screen.getByText("Pesquisar filial")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Pesquisar filial" }), { target: { value: "Mundo" } });

    expect(screen.getByText("Mundo Novo")).toBeInTheDocument();
    expect(screen.queryByText("Douradina")).not.toBeInTheDocument();
  });
});
