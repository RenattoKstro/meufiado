// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GoalCard from "./GoalCard";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("GoalCard", () => {
  afterEach(cleanup);

  const fiadoTiers = [{ target: 94, reward: 52.5 }, { target: 96, reward: 63 }, { target: 98, reward: 84 }, { target: 99, reward: 94.5 }, { target: 100, reward: 241.5 }, { target: 101, reward: 84 }, { target: 103, reward: 84 }, { target: 105, reward: 84 }];
  const requiredProps = { title: "Meta Fiado", description: "Teste", received: 100, accumulated: 0, total: 100, tiers: fiadoTiers, daysTotal: 20, daysElapsed: 10, referenceGoal: 1000, dailyGoal: 100, dailyReceived: 60, targetMissing: (target: number) => target * 10 };

  it("exibe as faixas em bolhas e mostra o valor faltante ao passar o cursor", () => {
    render(<GoalCard {...requiredProps} progress={71} />);

    for (const target of [94, 96, 98, 99, 100, 101, 103, 105]) expect(screen.getByRole("button", { name: new RegExp(`Faixa de ${target}%`) })).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole("button", { name: /faixa de 94%/i }));
    expect(screen.getByText(/Falta para 94%/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?940,00/)).toBeInTheDocument();
  });

  it("mostra as bolhas 96%, 98% e 100% do desafio", () => {
    render(<GoalCard {...requiredProps} title="Meta Desafio" progress={71} tiers={[{ target: 96, reward: 200 }, { target: 98, reward: 150 }, { target: 100, reward: 150 }]} />);

    for (const target of [96, 98, 100]) expect(screen.getByRole("button", { name: new RegExp(`Faixa de ${target}%`) })).toBeInTheDocument();
    expect(screen.queryByText("Falta para 94%")).not.toBeInTheDocument();
  });

  it("muda a cor do progresso circular por faixa e marca as bolhas atingidas", () => {
    const { rerender } = render(<GoalCard {...requiredProps} progress={49.99} />);
    expect(screen.getByRole("progressbar", { name: "Progresso circular Meta Fiado" })).toHaveAttribute("data-progress-tone", "red");

    rerender(<GoalCard {...requiredProps} progress={63} />);
    expect(screen.getByRole("progressbar", { name: "Progresso circular Meta Fiado" })).toHaveAttribute("data-progress-tone", "yellow");

    rerender(<GoalCard {...requiredProps} progress={98} tiers={[{ target: 94, reward: 52.5 }, { target: 98, reward: 84 }, { target: 105, reward: 84 }]} />);
    expect(screen.getByRole("progressbar", { name: "Progresso circular Meta Fiado" })).toHaveAttribute("data-progress-tone", "blue");
    expect(screen.getByRole("button", { name: /faixa de 94% atingida/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /faixa de 98% atingida/i })).toBeInTheDocument();

    rerender(<GoalCard {...requiredProps} progress={100} />);
    expect(screen.getByRole("progressbar", { name: "Progresso circular Meta Fiado" })).toHaveAttribute("data-progress-tone", "green");
  });

  it("destaca Meta diária / Rec. hoje em vermelho e verde conforme o atingimento", () => {
    const { rerender } = render(<GoalCard {...requiredProps} progress={63} dailyReceived={60} />);
    expect(screen.getByText("Meta diária ainda não atingida")).toBeInTheDocument();

    rerender(<GoalCard {...requiredProps} progress={63} dailyReceived={100} />);
    expect(screen.getByText("Meta diária atingida")).toBeInTheDocument();
  });

});
