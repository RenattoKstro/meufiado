import { CALLING_LIST_LABELS, type CallingListColumn, type CallingListRow } from "./callingList";

export const callingListPdfColumnWidths: Record<CallingListColumn, number> = {
  vendor: 26,
  delay: 16,
  overdueValue: 26,
  document: 32,
  customer: 58,
  phone: 117,
};

export const callingListExcelColumnWidths: Record<CallingListColumn, number> = {
  vendor: 14,
  delay: 6,
  overdueValue: 11,
  document: 15,
  customer: 28,
  phone: 13,
};

function splitPhones(value: string) {
  return value.split("•").map(phone => phone.trim()).filter(Boolean);
}

export function buildCallingListExport(rows: CallingListRow[], columns: CallingListColumn[]) {
  return {
    headers: columns.map(column => CALLING_LIST_LABELS[column]),
    body: rows.map(row => columns.map(column => row[column] || "—")),
    pdfWidths: columns.map(column => callingListPdfColumnWidths[column]),
    excelWidths: columns.map(column => ({ wch: callingListExcelColumnWidths[column] })),
  };
}

export function buildCompactCallingListExcelExport(rows: CallingListRow[], columns: CallingListColumn[]) {
  const phoneColumnCount = columns.includes("phone")
    ? Math.max(1, ...rows.map(row => splitPhones(row.phone).length))
    : 0;
  const headers = columns.flatMap(column => {
    if (column !== "phone") return [CALLING_LIST_LABELS[column]];
    return Array.from({ length: phoneColumnCount }, (_, index) => index === 0 ? "Telefone" : `Telefone ${index + 1}`);
  });
  const body = rows.map(row => columns.flatMap(column => {
    if (column !== "phone") return [row[column] || "—"];
    const phones = splitPhones(row.phone);
    return Array.from({ length: phoneColumnCount }, (_, index) => phones[index] || "");
  }));
  const excelWidths = columns.flatMap(column => column === "phone"
    ? Array.from({ length: phoneColumnCount }, () => ({ wch: callingListExcelColumnWidths.phone }))
    : [{ wch: callingListExcelColumnWidths[column] }]);

  return {
    headers,
    body,
    excelWidths,
    rowHeight: 12,
    autoFilterRef: `A1:${String.fromCharCode(64 + headers.length)}${body.length + 1}`,
  };
}
