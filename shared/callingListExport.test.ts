import { describe, expect, it } from "vitest";
import { buildCallingListExport } from "./callingListExport";

describe("buildCallingListExport", () => {
  const rows = [{
    id: "acao-1",
    vendor: "Ana",
    delay: "12",
    overdueValue: "R$ 1.200,00",
    document: "123.456.789-00",
    customer: "Cliente Exemplo",
    phone: "(11) 99999-0000",
  }];

  it("exporta apenas as colunas visíveis e mantém a ordem escolhida", () => {
    const exportData = buildCallingListExport(rows, ["vendor", "customer", "phone"]);

    expect(exportData.headers).toEqual(["Vendedor", "Cliente", "Telefone"]);
    expect(exportData.body).toEqual([["Ana", "Cliente Exemplo", "(11) 99999-0000"]]);
    expect(exportData.excelWidths).toEqual([{ wch: 22 }, { wch: 34 }, { wch: 44 }]);
  });

  it("mantém a largura de todas as seis colunas dentro da área útil de um A4 horizontal", () => {
    const exportData = buildCallingListExport(rows, ["vendor", "delay", "overdueValue", "document", "customer", "phone"]);

    expect(exportData.pdfWidths.reduce((total, width) => total + width, 0)).toBeLessThanOrEqual(281);
  });
});
