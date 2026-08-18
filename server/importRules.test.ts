import { describe, expect, it } from "vitest";
import { analyticRowFromSpreadsheet, branchRowFromSpreadsheet, normalizeBranchCode, spreadsheetNumber, uniqueRowsByBranchCode } from "../shared/importRules";

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

  it("mapeia as colunas do Analítico e converte valores brasileiros", () => {
    const row: unknown[] = [];
    row[0] = "024.001"; row[2] = "Norte"; row[6] = "1.200,50"; row[7] = 800; row[8] = "430,25"; row[17] = 40; row[18] = "2,5"; row[19] = 120; row[20] = 50;
    expect(analyticRowFromSpreadsheet(row)).toMatchObject({ code: "24001", regional: "Norte", creditGoal: 1200.5, challengeGoal: 800, currentOverdue: 430.25, monthlyLoss: 40, lossSalesPercent: 2.5, lostGoal: 120, lostReceived: 50 });
    expect(spreadsheetNumber("R$ 3.400,10")).toBe(3400.1);
  });

  it("mantém apenas a primeira linha de cada filial repetida", () => {
    expect(uniqueRowsByBranchCode([{ code: "2", name: "Primeira" }, { code: "2", name: "Repetida" }, { code: "3", name: "Outra" }])).toEqual([{ code: "2", name: "Primeira" }, { code: "3", name: "Outra" }]);
  });
});
