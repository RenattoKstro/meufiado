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
  vendor: 22,
  delay: 12,
  overdueValue: 18,
  document: 22,
  customer: 34,
  phone: 44,
};

export function buildCallingListExport(rows: CallingListRow[], columns: CallingListColumn[]) {
  return {
    headers: columns.map(column => CALLING_LIST_LABELS[column]),
    body: rows.map(row => columns.map(column => row[column] || "—")),
    pdfWidths: columns.map(column => callingListPdfColumnWidths[column]),
    excelWidths: columns.map(column => ({ wch: callingListExcelColumnWidths[column] })),
  };
}
