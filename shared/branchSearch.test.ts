import { describe, expect, it } from "vitest";
import { filterBranchOverviewsBySearch } from "./branchSearch";

const items = [
  { branch: { name: "Filial São José", code: "024001", regional: "Sul" }, operator: { fullName: "Ana Líder" } },
  { branch: { name: "Filial Centro", code: "01002", regional: "Norte" }, operator: { fullName: "Bruno Auxiliar" } },
];

describe("busca rápida de filiais", () => {
  it("encontra a filial por nome, código normalizado, regional e operador", () => {
    expect(filterBranchOverviewsBySearch(items, "sao jose")).toEqual([items[0]]);
    expect(filterBranchOverviewsBySearch(items, "024.001")).toEqual([items[0]]);
    expect(filterBranchOverviewsBySearch(items, "norte")).toEqual([items[1]]);
    expect(filterBranchOverviewsBySearch(items, "bruno")).toEqual([items[1]]);
  });

  it("mantém a lista integral para uma busca vazia e retorna vazio quando não há correspondência", () => {
    expect(filterBranchOverviewsBySearch(items, "  ")).toEqual(items);
    expect(filterBranchOverviewsBySearch(items, "inexistente")).toEqual([]);
  });
});
