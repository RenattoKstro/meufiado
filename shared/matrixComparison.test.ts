import { describe, expect, it } from "vitest";
import { comparisonCodesFromSearch, sortMatrixItemsByComparisonCodes } from "./matrixComparison";

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
});
