// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import GoalCard from "./GoalCard";

describe("GoalCard", () => {
  afterEach(cleanup);

  it("mostra o valor faltante para todas as faixas configuradas ao abrir as projeções", () => {
    render(<GoalCard title="Meta Fiado" description="Teste" progress={71} received={100} accumulated={0} total={100} tiers={[{ target: 94, reward: 52.5 }, { target: 96, reward: 63 }, { target: 98, reward: 84 }, { target: 99, reward: 94.5 }, { target: 100, reward: 241.5 }, { target: 101, reward: 84 }, { target: 103, reward: 84 }, { target: 105, reward: 84 }]} daysTotal={20} daysElapsed={10} referenceGoal={1000} targetMissing={target => target * 10} />);

    fireEvent.click(screen.getByRole("button", { name: /ver faixas e projeções/i }));

    for (const target of [94, 96, 98, 99, 100, 101, 103, 105]) {
      expect(screen.getByText(`Falta para ${target}%`)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`R\\$\\s?${(target * 10).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`))).toBeInTheDocument();
    }
  });

  it("mostra as faixas 96%, 98% e 100% do desafio", () => {
    render(<GoalCard title="Meta Desafio" description="Teste" progress={71} received={100} accumulated={0} total={100} tiers={[{ target: 96, reward: 200 }, { target: 98, reward: 150 }, { target: 100, reward: 150 }]} daysTotal={20} daysElapsed={10} referenceGoal={1000} targetMissing={target => target} accent="violet" />);

    fireEvent.click(screen.getByRole("button", { name: /ver faixas e projeções/i }));

    for (const target of [96, 98, 100]) expect(screen.getByText(`Falta para ${target}%`)).toBeInTheDocument();
    expect(screen.queryByText("Falta para 94%")).not.toBeInTheDocument();
  });
});
