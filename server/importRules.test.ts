import { describe, expect, it } from "vitest";
import { analyticRowFromSpreadsheet, branchRowFromSpreadsheet, challengeDailyRowFromSpreadsheet, dailyTrackingRowFromSpreadsheet, dataRowFromSpreadsheet, normalizeBranchCode, receiptDailyRowFromSpreadsheet, spreadsheetNumber, spreadsheetPercent, uniqueRowsByBranchCode } from "../shared/importRules";

describe("importação de planilhas", () => {
  it("normaliza os formatos alternativos de código de filial", () => {
    expect(normalizeBranchCode("01.002")).toBe("1002");
    expect(normalizeBranchCode(2)).toBe("2");
    expect(normalizeBranchCode("024.001")).toBe("24001");
    expect(normalizeBranchCode("24001")).toBe("24001");
    expect(normalizeBranchCode("01.002")).toBe(normalizeBranchCode("1002"));
  });

  it("mapeia as colunas A, B e C do cadastro de filiais", () => {
    expect(branchRowFromSpreadsheet(["01.002", "Sul", "Filial Centro"])).toEqual({ code: "1002", regional: "Sul", name: "Filial Centro" });
  });

  it("mapeia as colunas do Analítico para Fiado, Desafio, Ticket e Perdas", () => {
    const row: unknown[] = [];
    row[0] = "024.001"; row[2] = "Norte"; row[6] = "1.200,50"; row[7] = 800; row[8] = "430,25"; row[9] = "7,2"; row[10] = "94,1"; row[11] = "96,3"; row[13] = 500; row[14] = 80; row[15] = 100; row[17] = 40; row[18] = "2,5"; row[19] = 120; row[20] = 50; row[21] = "41,67";
    expect(analyticRowFromSpreadsheet(row)).toEqual({ code: "24001", regional: "Norte", creditGoal: 1200.5, challengeGoal: 800, received: 430.25, delinquencyPercent: 7.2, creditEffectivenessPercent: 94.1, challengeEffectivenessPercent: 96.3, ticketGoal: 500, ticketPercent: 80, ticketBonus: 100, monthlyLoss: 40, lossSalesPercent: 2.5, lostGoal: 120, lostReceived: 50, lossEffectivenessPercent: 41.67 });
    expect(spreadsheetNumber("R$ 3.400,10")).toBe(3400.1);
  });

  it("converte células percentuais brutas do Excel sem alterar percentuais escritos", () => {
    expect(spreadsheetPercent(0.6863)).toBeCloseTo(68.63);
    expect(spreadsheetPercent(0.8138)).toBeCloseTo(81.38);
    expect(spreadsheetPercent(0.8114)).toBeCloseTo(81.14);
    expect(spreadsheetPercent("68,63%")).toBeCloseTo(68.63);
  });

  it("mapeia Dados, acompanhamento diário e os 31 dias da Meta Desafio pela filial", () => {
    const data: unknown[] = []; data[1] = "01.002"; data[4] = "Sul"; data[10] = 1000; data[11] = 850; data[12] = 5000; data[14] = 1200; data[15] = 1100; data[16] = 95; data[21] = 200; data[22] = 150; data[23] = 50;
    const daily: unknown[] = []; daily[0] = "01.002"; daily[3] = 80; daily[4] = 95; daily[5] = 15; daily[6] = 45; daily[7] = 110;
    const challenge: unknown[] = []; challenge[0] = "01.002"; challenge[1] = "Sul"; challenge[2] = 10; challenge[32] = 310;
    expect(dataRowFromSpreadsheet(data)).toEqual({ code: "1002", regional: "Sul", amountReceivable: 1000, overdueOpening: 850, portfolioTotal: 5000, receiptForecast: 1200, closingForecast: 1100, closingForecastPercent: 95, accumulatedLossGoal: 200, accumulatedLossReceived: 150, accumulatedLossBalance: 50 });
    expect(dailyTrackingRowFromSpreadsheet(daily)).toEqual({ code: "1002", previousDayGoal: 80, received: 95, previousDayDifference: 15, accumulatedDifference: 45, redesignedDailyGoal: 110 });
    expect(challengeDailyRowFromSpreadsheet(challenge)).toMatchObject({ code: "1002", regional: "Sul", dailyReceived: expect.arrayContaining([10, 310]) });
    expect(challengeDailyRowFromSpreadsheet(challenge)?.dailyReceived).toHaveLength(31);
  });

  it("mantém apenas a primeira linha de cada filial repetida", () => {
    expect(uniqueRowsByBranchCode([{ code: "2", name: "Primeira" }, { code: "2", name: "Repetida" }, { code: "3", name: "Outra" }])).toEqual([{ code: "2", name: "Primeira" }, { code: "3", name: "Outra" }]);
  });

  it("mapeia Vencido_Dia e preserva os dias sem valor como sem dado", () => {
    const row: unknown[] = [];
    row[0] = "01.002";
    row[2] = "12.500,00";
    row[7] = null;
    row[14] = false;
    row[21] = "325,40";
    const receipt = receiptDailyRowFromSpreadsheet(row);
    expect(receipt).toMatchObject({ code: "1002", sales: 12500 });
    expect(receipt?.dailyReceived.slice(0, 3)).toEqual([null, null, 325.4]);
    expect(receipt?.dailyReceived).toHaveLength(31);
  });
});
