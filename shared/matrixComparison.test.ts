import { describe, expect, it } from "vitest";
import { comparisonCodesFromSearch, comparisonEffectivenessHighlights, sortMatrixItemsByComparisonCodes, sortMatrixItemsForDisplay } from "./matrixComparison";

describe("comparação da Matriz", () => {
  it("aceita até quatro códigos separados por vírgula, normaliza e preserva a ordem", () => {
    expect(comparisonCodesFromSearch("359, 14.002, 24001, 165, 382")).toEqual(["359", "14002", "24001", "165"]);
  });

  it("ordena somente as filiais solicitadas conforme a sequência digitada", () => {
    const rows = [
      { branch: { code: "358" } },
      { branch: { code: "165" } },
      { branch: { code: "359" } },
      { branch: { code: "382" } },
      { branch: { code: "999" } },
    ];

    expect(sortMatrixItemsByComparisonCodes(rows, comparisonCodesFromSearch("359, 358, 165, 382")).map(row => row.branch.code)).toEqual(["359", "358", "165", "382"]);
  });

  it("destaca automaticamente a maior e a menor efetividade de fiado", () => {
    const rows = [
      { branch: { id: 1, code: "359" }, metrics: { creditEffectivenessPercent: 82.5, challengeEffectivenessPercent: 71, ticketPercent: 75 } },
      { branch: { id: 2, code: "358" }, metrics: { creditEffectivenessPercent: 91.2, challengeEffectivenessPercent: 88, ticketPercent: 80 } },
      { branch: { id: 3, code: "165" }, metrics: { creditEffectivenessPercent: 65.3, challengeEffectivenessPercent: 92, ticketPercent: 66 } },
    ];

    expect(comparisonEffectivenessHighlights(rows)).toEqual(new Map([[2, "best"], [3, "worst"]]));
    expect(comparisonEffectivenessHighlights([rows[0], { branch: { id: 4, code: "999" }, metrics: { ...rows[0].metrics } }])).toEqual(new Map());
  });

  it("ordena a visualização por código e por percentuais solicitados", () => {
    const rows = [
      { branch: { id: 1, code: "359" }, metrics: { creditEffectivenessPercent: 82.5, challengeEffectivenessPercent: 71, ticketPercent: 75 } },
      { branch: { id: 2, code: "165" }, metrics: { creditEffectivenessPercent: 91.2, challengeEffectivenessPercent: 88, ticketPercent: 80 } },
      { branch: { id: 3, code: "358" }, metrics: { creditEffectivenessPercent: 65.3, challengeEffectivenessPercent: 92, ticketPercent: 66 } },
    ];

    expect(sortMatrixItemsForDisplay(rows, "numeric").map(row => row.branch.code)).toEqual(["165", "358", "359"]);
    expect(sortMatrixItemsForDisplay(rows, "creditEffectivenessDesc").map(row => row.branch.code)).toEqual(["165", "359", "358"]);
    expect(sortMatrixItemsForDisplay(rows, "challengeEffectivenessAsc").map(row => row.branch.code)).toEqual(["359", "165", "358"]);
  });
});
