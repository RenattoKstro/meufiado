// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import GoalCard from "@/components/GoalCard";
import { FIADO_TIERS } from "../../../shared/goalRules";

describe("previsão da Matriz dentro dos cards de metas", () => {
  afterEach(cleanup);

  const baseProps = {
    description: "Descrição",
    progress: 96,
    received: 8_000,
    accumulated: 200,
    total: 787.5,
    tiers: FIADO_TIERS.leader,
    daysTotal: 22,
    daysElapsed: 10,
    referenceGoal: 10_000,
    dailyGoal: 100,
    dailyReceived: 120,
  };

  it("mostra a previsão de fechamento e inadimplência prevista dentro do Fiado", () => {
    render(<GoalCard {...baseProps} title="Meta Fiado" forecastClosing={12_500} forecastClosingPercent={125} forecastPercent={6.25} gap={{ status: "outside", amount: 2_500, projected: 12_500, message: "Fora da meta de fechamento da Matriz." }} />);
    expect(screen.getByText("Previsão de fechamento")).toBeInTheDocument();
    expect(screen.getByText("Previsão de inadimplência %")).toBeInTheDocument();
    expect(screen.getByText("6.25%")).toBeInTheDocument();
    expect(screen.getByText("125.00% da meta")).toBeInTheDocument();
    expect(screen.getByText("GAP da Meta Fiado")).toBeInTheDocument();
    expect(screen.getByText("Fora da meta")).toBeInTheDocument();
  });

  it("mostra o GAP da Meta Desafio dentro do card correspondente", () => {
    render(<GoalCard {...baseProps} title="Meta Desafio" gap={{ status: "inside", amount: 1_500, projected: 8_500, message: "Dentro da meta de fechamento da Matriz." }} />);
    expect(screen.getByText("GAP da Meta Desafio")).toBeInTheDocument();
    expect(screen.getByText("Dentro da meta")).toBeInTheDocument();
  });
});
