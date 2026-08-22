// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ManagementOverview } from "./Admin";

describe("painel gerencial", () => {
  afterEach(cleanup);

  it("consolida risco, projeção e indicadores por regional", () => {
    render(<ManagementOverview isLoading={false} rows={[
      { branch: { id: 1, name: "Filial em atenção", code: "001", regional: "Sul", isActive: true }, metrics: { portfolioTotal: 1000, monthOpening: 1000, currentOverdue: 900, creditGoal: 700, workingDaysTotal: 20, workingDaysElapsed: 10 } },
      { branch: { id: 2, name: "Filial estável", code: "002", regional: "Norte", isActive: true }, metrics: { portfolioTotal: 1000, monthOpening: 1000, currentOverdue: 600, creditGoal: 700, workingDaysTotal: 20, workingDaysElapsed: 10 } },
    ]} />);

    expect(screen.getByText("Risco e projeção da operação")).toBeInTheDocument();
    expect(screen.getByText("Filiais críticas")).toBeInTheDocument();
    expect(screen.getByText("Média por regional")).toBeInTheDocument();
    expect(screen.getByText("Sul")).toBeInTheDocument();
    expect(screen.getByText("Norte")).toBeInTheDocument();
  });
});
