import { describe, expect, it } from "vitest";
import { buildCallingListExport, buildCompactCallingListExcelExport } from "./callingListExport";

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
    expect(exportData.excelWidths).toEqual([{ wch: 17 }, { wch: 36 }, { wch: 16 }]);
  });

  it("mantém a largura de todas as seis colunas dentro da área útil de um A4 horizontal", () => {
    const exportData = buildCallingListExport(rows, ["vendor", "delay", "overdueValue", "document", "customer", "phone"]);

    expect(exportData.pdfWidths.reduce((total, width) => total + width, 0)).toBeLessThanOrEqual(281);
  });

  it("separa vários telefones e prepara uma planilha compacta com linhas de 15 pontos", () => {
    const exportData = buildCompactCallingListExcelExport([{ ...rows[0], phone: "(11) 99999-0000 • (11) 98888-1111" }], ["vendor", "delay", "overdueValue", "document", "customer", "phone"]);

    expect(exportData.headers).toEqual(["Vendedor", "Atraso", "Valor Vencido", "CPF/CNPJ Cliente", "Cliente", "Telefone", "Telefone 2"]);
    expect(exportData.body[0]).toEqual(["Ana", "12", "R$ 1.200,00", "123.456.789-00", "Cliente Exemplo", "(11) 99999-0000", "(11) 98888-1111"]);
    expect(exportData.rowHeight).toBe(15);
    expect(exportData.autoFilterRef).toBe("A1:G2");
    expect(exportData.excelWidths).toEqual([{ wch: 17 }, { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 36 }, { wch: 16 }, { wch: 16 }]);
  });
});
