// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ReceiptProjectionCard } from "./Dashboard";

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
};

describe("card de projeção de recebimento", () => {
  afterEach(cleanup);

  it("mostra o convite ao PRO sem expor os números ao usuário Free", () => {
    render(<ReceiptProjectionCard projection={projection} canView={false} isLoading={false} />);

    expect(screen.getByText("Somente usuários PRO poderá ver a projeção.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conhecer o plano PRO" })).toHaveAttribute("href", "/plano");
    expect(screen.queryByText("Estimativa de recebido no mês")).not.toBeInTheDocument();
  });

  it("apresenta projeção, saldo e necessidade diária ao usuário PRO", () => {
    render(<ReceiptProjectionCard projection={projection} canView isLoading={false} />);

    expect(screen.getByText("Estimativa de recebido no mês")).toBeInTheDocument();
    expect(screen.getByText("Com histórico diário")).toBeInTheDocument();
    expect(screen.getByText("Média por dia")).toBeInTheDocument();
    expect(screen.getByText("Falta receber")).toBeInTheDocument();
    expect(screen.getByText("Necessário por dia")).toBeInTheDocument();
  });
});
