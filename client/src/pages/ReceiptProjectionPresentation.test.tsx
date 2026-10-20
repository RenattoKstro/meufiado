// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { GoalGapCard, MatrixClosingForecastCard } from "./Dashboard";

describe("previsão da Matriz e GAP das metas", () => {
  afterEach(cleanup);

  it("mostra a previsão de fechamento importada da Matriz", () => {
    render(<MatrixClosingForecastCard closingForecast={12_500} closingForecastPercent={96.5} canView isLoading={false} />);
    expect(screen.getByText("Previsão de fechamento")).toBeInTheDocument();
    expect(screen.getByText("Fechamento previsto")).toBeInTheDocument();
    expect(screen.getByText("96.50%")).toBeInTheDocument();
  });

  it("informa quando ainda não existe previsão da Matriz", () => {
    render(<MatrixClosingForecastCard closingForecast={null} closingForecastPercent={null} canView isLoading={false} />);
    expect(screen.getByText("Ainda não há previsão importada da Matriz para esta filial.")).toBeInTheDocument();
  });

  it("apresenta GAPs dentro e fora da meta", () => {
    const { rerender } = render(<GoalGapCard label="GAP Meta Fiado" gap={{ status: "outside", amount: 2_500, projected: 12_500, message: "Fora da meta de fechamento da Matriz." }} goal={10_000} />);
    expect(screen.getByText("GAP Meta Fiado")).toBeInTheDocument();
    expect(screen.getByText("Fora")).toBeInTheDocument();
    rerender(<GoalGapCard label="GAP Meta Desafio" gap={{ status: "inside", amount: 1_500, projected: 8_500, message: "Dentro da meta de fechamento da Matriz." }} goal={10_000} />);
    expect(screen.getByText("GAP Meta Desafio")).toBeInTheDocument();
    expect(screen.getByText("Dentro")).toBeInTheDocument();
  });
});
