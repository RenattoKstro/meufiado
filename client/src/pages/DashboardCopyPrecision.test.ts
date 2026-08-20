import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const dashboardSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");
const goalCardSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/GoalCard.tsx"), "utf8");

describe("textos e precisão da Visão Geral", () => {
  it("preserva os rótulos solicitados e remove fórmulas internas dos cartões", () => {
    expect(dashboardSource).toContain('note="Conforme percentual atingidos"');
    expect(dashboardSource).toContain('label="Meta 80%"');
    expect(dashboardSource).not.toContain("Valor da Meta 80%");
    expect(dashboardSource).not.toContain("Valor da Meta de 80%");
    expect(dashboardSource).not.toContain("Abertura do mês − vencido atual");
    expect(dashboardSource).not.toContain("Abertura do mês − Meta Fiado");
    expect(dashboardSource).not.toContain("À receber × 80%");
    expect(dashboardSource).not.toContain("Vencido atual ÷ carteira total");
    expect(dashboardSource).toContain('label="Recebido hoje"');
    expect(dashboardSource).toContain("value={currency(receipts.today)}");
    expect(dashboardSource).not.toContain("Abertura do dia − vencido atual");
  });

  it("exibe os percentuais principais com duas casas decimais", () => {
    expect(dashboardSource).toContain("progress.toFixed(2)");
    expect(goalCardSource).toContain("progress.toFixed(2)");
    expect(goalCardSource).toContain("tierProgress.toFixed(2)");
  });
});
