import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const dashboardSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");
const goalCardSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/GoalCard.tsx"), "utf8");
const welcomeSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Welcome.tsx"), "utf8");
const appTextContextSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/contexts/AppTextContext.tsx"), "utf8");

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
    expect(dashboardSource).toContain('label="Meta Diária / Rec. Hoje"');
    expect(dashboardSource).toContain("const dailyGoal = dailyCollectionGoal(metrics.currentOverdue, metrics.creditGoal, workingDaysRemaining);");
    expect(dashboardSource).toContain("value={`${currency(dailyGoal)} / ${currency(receipts.today)}`}");
    expect(dashboardSource).not.toContain('label="Recebido hoje"');
    expect(dashboardSource).not.toContain("Abertura do dia − vencido atual");
  });

  it("exibe os percentuais principais com duas casas decimais", () => {
    expect(dashboardSource).toContain("progress.toFixed(2)");
    expect(goalCardSource).toContain("progress.toFixed(2)");
    expect(goalCardSource).toContain("tierProgress.toFixed(2)");
  });

  it("destaca os valores restantes de Fiado e Desafio na Visão Geral e nos cartões principais", () => {
    expect(dashboardSource).toContain("const fiadoRemaining = remainingToGoal(metrics.currentOverdue, metrics.creditGoal)");
    expect(dashboardSource).toContain("const challengeRemaining = remainingToGoal(metrics.currentOverdue, metrics.challengeGoal)");
    expect(dashboardSource).toContain('label="Restante Fiado"');
    expect(dashboardSource).toContain('label="Restante Desafio"');
    expect(dashboardSource).toContain('remainingLabel="Restante Fiado"');
    expect(dashboardSource).toContain('remainingLabel="Restante Desafio"');
    expect(goalCardSource).toContain("remainingLabel?: string");
    expect(goalCardSource).toContain("remainingValue?: number");
  });

  it("exibe o vencido atual como indicador separado na Visão Geral", () => {
    expect(dashboardSource).toContain('label="Vencido atual"');
    expect(dashboardSource).toContain("value={currency(metrics.currentOverdue)}");
  });

  it("usa a frase de apresentação revisada", () => {
    expect(welcomeSource).toContain("texts.slogan");
    expect(appTextContextSource).toContain("Acompanhando de perto suas metas todos dias.");
    expect(appTextContextSource).not.toContain("Acompanhando de suas metas");
  });
});
