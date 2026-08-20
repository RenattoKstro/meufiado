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

  it("abre os contatos e disponibiliza conversa privada ao selecionar o operador", () => {
    overviewQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [{
        branch: { id: 3, name: "Naviraí", code: "10004", regional: "MS" },
        operator: { id: 11, userId: 77, fullName: "Ana Souza", phone: "(67) 99999-0000", instagram: "ana.recebe", operatorType: "leader", isOnVacation: false, lastSignedIn: new Date() },
        metrics,
        updatedAt: new Date(),
      }],
    });

    render(<Branches />);
    expect(screen.queryByText("Contato do operador")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ana Souza/ }));

    expect(screen.getByText("Contato do operador")).toBeInTheDocument();
    expect(screen.getByText("(67) 99999-0000")).toBeInTheDocument();
    expect(screen.getByText("@ana.recebe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chat privado" })).toHaveAttribute("href", "/chat?perfil=77");
    expect(screen.getByRole("button", { name: /Ana Souza/ })).toHaveAttribute("aria-expanded", "true");
  });
});
