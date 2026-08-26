import { describe, expect, it } from "vitest";
import { convertCallingListRows, filterCallingListRows, listCallingVendors, parseCallingListOverdueValue } from "./callingList";

describe("convertCallingListRows", () => {
  it("preserva somente os campos necessários e reúne os telefones móveis", () => {
    const rows = convertCallingListRows([{
      "Data Lista": "01/08/2026",
      Assessoria: "Regional Sul",
      Vendedor: "Ana",
      Atraso: "18",
      "Valor Vencido": "1.240,50",
      "CPF/CNPJ Cliente": "123.456.789-00",
      Cliente: "Cliente Teste",
      "Telefone Móvel 1": "(11) 99999-0000",
      "Telefone Móvel 2": "(11) 98888-0000",
      Cidade: "São Paulo",
    }]);

    expect(rows).toEqual([{
      id: "acao-1",
      vendor: "Ana",
      delay: "18",
      overdueValue: "R$ 1.240,50",
      document: "123.456.789-00",
      customer: "Cliente Teste",
      phone: "(11) 99999-0000 • (11) 98888-0000",
    }]);
  });

  it("normaliza cabeçalhos sem acento, remove linhas vazias e lista vendedores distintos", () => {
    const rows = convertCallingListRows([
      { Vendedor: "Bruno", Atraso: 2, "CPF CNPJ Cliente": "00.000.000/0001-00", Cliente: "Loja Dois", "Telefone Móvel 1": "11900000000", "Valor Vencido": "250.5" },
      { Vendedor: "Ana", Cliente: "Loja Um", "Telefone Móvel 1": "11800000000" },
      { "Data Lista": "01/08/2026", Assessoria: "Sem contato" },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ delay: "2", document: "00.000.000/0001-00", overdueValue: "R$ 250,50" });
    expect(listCallingVendors(rows)).toEqual(["Ana", "Bruno"]);
  });

  it("filtra o Valor Vencido entre os limites mínimo e máximo em formato brasileiro", () => {
    const rows = convertCallingListRows([
      { Vendedor: "Ana", Cliente: "Até o limite inferior", "Valor Vencido": "499,99" },
      { Vendedor: "Ana", Cliente: "Dentro da faixa", "Valor Vencido": "500,00" },
      { Vendedor: "Bruno", Cliente: "Também na faixa", "Valor Vencido": "1.000,00" },
      { Vendedor: "Bruno", Cliente: "Acima do limite", "Valor Vencido": "1.000,01" },
    ]);

    expect(parseCallingListOverdueValue("R$ 1.000,00")).toBe(1000);
    expect(parseCallingListOverdueValue("250.5")).toBe(250.5);
    expect(filterCallingListRows(rows, { minOverdueValue: "500", maxOverdueValue: "1.000,00" }).map(row => row.customer)).toEqual([
      "Dentro da faixa",
      "Também na faixa",
    ]);
  });
});
