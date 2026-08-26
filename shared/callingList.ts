export const CALLING_LIST_COLUMNS = ["vendor", "delay", "overdueValue", "document", "customer", "phone"] as const;

export type CallingListColumn = typeof CALLING_LIST_COLUMNS[number];
export type CallingListRow = Record<CallingListColumn, string> & { id: string };

export const CALLING_LIST_LABELS: Record<CallingListColumn, string> = {
  vendor: "Vendedor",
  delay: "Atraso",
  overdueValue: "Valor Vencido",
  document: "CPF/CNPJ Cliente",
  customer: "Cliente",
  phone: "Telefone",
};

function normalizedHeader(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function toCellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isInteger(value)) return String(value);
  return String(value).trim();
}

function valueFrom(row: Record<string, unknown>, candidates: string[]) {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const found = entries.find(([key]) => normalizedHeader(key) === normalizedHeader(candidate));
    if (found) return toCellValue(found[1]);
  }
  return "";
}

function formatOverdueValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/[R$]/i.test(trimmed)) return trimmed;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric) : trimmed;
}

export function convertCallingListRows(sourceRows: Record<string, unknown>[]): CallingListRow[] {
  return sourceRows.map((source, index) => {
    const phones = ["Telefone Móvel 1", "Telefone Móvel 2", "Telefone Móvel 3", "Telefone Móvel 4", "Telefone Móvel 5"]
      .map(column => valueFrom(source, [column]))
      .filter((phone, phoneIndex, items) => phone && items.indexOf(phone) === phoneIndex);
    return {
      id: `acao-${index + 1}`,
      vendor: valueFrom(source, ["Vendedor"]),
      delay: valueFrom(source, ["Atraso"]),
      overdueValue: formatOverdueValue(valueFrom(source, ["Valor Vencido"])),
      document: valueFrom(source, ["CPF/CNPJ Cliente", "CPF CNPJ Cliente"]),
      customer: valueFrom(source, ["Cliente"]),
      phone: phones.join(" • "),
    };
  }).filter(row => CALLING_LIST_COLUMNS.some(column => row[column]));
}

export function listCallingVendors(rows: CallingListRow[]) {
  return Array.from(new Set(rows.map(row => row.vendor).filter(Boolean))).sort((first, second) => first.localeCompare(second, "pt-BR"));
}
