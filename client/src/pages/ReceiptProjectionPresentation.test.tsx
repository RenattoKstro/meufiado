// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { FiadoGoalGapCard, ReceiptProjectionCard } from "./Dashboard";

const projection = {
  source: "daily-history" as const,
  totalReceived: 3_000,
  daysBase: 3,
  averagePerDay: 1_000,
  daysRemaining: 10,
  remainingToReceive: 12_000,
  dailyNeeded: 1_200,
  projectedReceived: 13_000,
  projectedCollectionRate: 52,
  targetReceived: 15_000,
  weightedDaysRemaining: 9.1,
};

describe("card de projeção de recebimento", () => {
  afterEach(cleanup);

  it("mostra o convite ao PRO sem expor os números ao usuário Free", () => {
    render(<ReceiptProjectionCard projection={projection} canView={false} isLoading={false} />);

    expect(screen.getByText("Somente usuários PRO podem ver a projeção e o GAP da Meta Fiado.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conhecer o plano PRO" })).toHaveAttribute("href", "/plano");
    expect(screen.queryByText("Estimativa de recebido na Meta Fiado")).not.toBeInTheDocument();
  });

  it("apresenta projeção, saldo e necessidade diária ao usuário PRO", () => {
    render(<ReceiptProjectionCard projection={projection} canView isLoading={false} />);

    expect(screen.getByText("Estimativa de recebido na Meta Fiado")).toBeInTheDocument();
    expect(screen.getByText("Com histórico diário")).toBeInTheDocument();
    expect(screen.getByText("Meta de recebimento")).toBeInTheDocument();
    expect(screen.getByText("Falta para a meta")).toBeInTheDocument();
    expect(screen.getByText("Necessário por dia")).toBeInTheDocument();
  });

  it("mostra o status e a diferença do GAP somente ao usuário PRO", () => {
    const gap = { status: "outside" as const, amount: 2_500, projectedOverdue: 12_500, creditGoal: 10_000, message: "Fora da Meta Fiado no ritmo projetado." };
    const { rerender } = render(<FiadoGoalGapCard gap={gap} canView={false} />);
    expect(screen.queryByText("GAP da Meta Fiado")).not.toBeInTheDocument();

    rerender(<FiadoGoalGapCard gap={gap} canView />);
    expect(screen.getByText("GAP da Meta Fiado")).toBeInTheDocument();
    expect(screen.getByText("Fora da meta")).toBeInTheDocument();
    expect(screen.getByText("GAP a recuperar")).toBeInTheDocument();
  });
});
