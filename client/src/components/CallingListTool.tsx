import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CALLING_LIST_COLUMNS, CALLING_LIST_LABELS, convertCallingListRows, listCallingVendors, type CallingListColumn, type CallingListRow } from "@shared/callingList";
import { buildCallingListExport } from "@shared/callingListExport";
import { Download, FileSpreadsheet, FileText, Grid3X3, ListFilter, Printer, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type ListDensity = "compact" | "normal" | "comfortable";

const densityClasses: Record<ListDensity, string> = {
  compact: "text-xs [&_input]:h-8 [&_input]:text-xs [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-2",
  normal: "text-sm [&_input]:h-9 [&_input]:text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2.5",
  comfortable: "text-sm [&_input]:h-10 [&_input]:text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3",
};

const columnWidths: Record<CallingListColumn, string> = {
  vendor: "min-w-40",
  delay: "min-w-24",
  overdueValue: "min-w-36",
  document: "min-w-40",
  customer: "min-w-52",
  phone: "min-w-56",
};

export default function CallingListTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CallingListRow[]>([]);
  const [vendor, setVendor] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<CallingListColumn[]>([...CALLING_LIST_COLUMNS]);
  const [showGrid, setShowGrid] = useState(true);
  const [density, setDensity] = useState<ListDensity>("normal");

  const vendors = useMemo(() => listCallingVendors(rows), [rows]);
  const displayedRows = useMemo(() => rows.filter(row => {
    const matchesVendor = vendor === "all" || row.vendor === vendor;
    const searchable = `${row.customer} ${row.document} ${row.phone} ${row.vendor}`.toLocaleLowerCase("pt-BR");
    return matchesVendor && searchable.includes(query.trim().toLocaleLowerCase("pt-BR"));
  }), [query, rows, vendor]);

  async function importSpreadsheet(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("A planilha não possui uma aba para leitura.");
      const converted = convertCallingListRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false }));
      if (!converted.length) throw new Error("Não encontrei as colunas esperadas. Confira se há Vendedor, Cliente ou Telefone.");
      setRows(converted);
      setVendor("all");
      setQuery("");
      toast.success(`${converted.length} contato${converted.length === 1 ? "" : "s"} preparado${converted.length === 1 ? "" : "s"} para a lista.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler a planilha.");
    }
  }

  function updateRow(id: string, column: CallingListColumn, value: string) {
    setRows(current => current.map(row => row.id === id ? { ...row, [column]: value } : row));
  }

  function removeRow(id: string) {
    setRows(current => current.filter(row => row.id !== id));
  }

  function toggleColumn(column: CallingListColumn, checked: boolean) {
    if (!checked && visibleColumns.length === 1) { toast.error("Mantenha ao menos uma coluna visível."); return; }
    setVisibleColumns(current => checked ? [...current, column] : current.filter(item => item !== column));
  }

  function exportExcel() {
    if (!displayedRows.length) { toast.error("Não há contatos filtrados para exportar."); return; }
    const { headers, body, excelWidths } = buildCallingListExport(displayedRows, visibleColumns);
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
    sheet["!cols"] = excelWidths;
    sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Lista de acionamento");
    XLSX.writeFile(workbook, "lista-acionamento.xlsx", { compression: true });
    toast.success("Lista editada exportada em Excel.");
  }

  function exportPdf() {
    if (!displayedRows.length) { toast.error("Não há contatos filtrados para exportar."); return; }
    const { headers, body, pdfWidths } = buildCallingListExport(displayedRows, visibleColumns);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Lista de acionamento", 8, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${vendor === "all" ? "Todos os vendedores" : `Vendedor: ${vendor}`} · ${displayedRows.length} contato(s)`, 8, 17);
    autoTable(doc, {
      startY: 22,
      head: [headers],
      body,
      theme: "grid",
      margin: { top: 22, right: 8, bottom: 8, left: 8 },
      tableWidth: 281,
      styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: [0, 151, 211], textColor: [255, 255, 255], fontStyle: "bold", halign: "left" },
      columnStyles: Object.fromEntries(pdfWidths.map((cellWidth, index) => [index, { cellWidth }])),
      rowPageBreak: "avoid",
    });
    doc.save("lista-acionamento.pdf");
    toast.success("Lista editada exportada em PDF horizontal.");
  }

  return <Card className="rounded-[1.7rem] border-border/70 shadow-sm"><style>{`@media print { @page { size: A4 landscape; margin: 8mm; } body * { visibility: hidden !important; } #aciona-one-print, #aciona-one-print * { visibility: visible !important; } #aciona-one-print { position: absolute; inset: 0; width: 100%; padding: 0; } #aciona-one-print input { border: 0 !important; padding: 0 !important; background: transparent !important; } .aciona-one-actions { display: none !important; } }`}</style><CardHeader className="gap-4 border-b border-border/60 pb-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" />Aciona One</CardTitle><CardDescription className="mt-2 max-w-2xl">Envie uma planilha de contatos. O sistema preserva apenas os campos necessários para acionamento, permite revisar a lista e a deixa pronta para impressão.</CardDescription></div><div className="aciona-one-actions flex flex-wrap gap-2"><input ref={fileInputRef} className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={event => void importSpreadsheet(event)} /><Button type="button" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Importar planilha</Button><Button type="button" variant="outline" disabled={!displayedRows.length} onClick={exportExcel}><Download className="mr-2 h-4 w-4" />Exportar Excel</Button><Button type="button" variant="outline" disabled={!displayedRows.length} onClick={exportPdf}><FileText className="mr-2 h-4 w-4" />Exportar PDF</Button><Button type="button" variant="outline" disabled={!displayedRows.length} onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir lista</Button></div></div><div className="aciona-one-actions grid gap-3 rounded-2xl bg-muted/45 p-4 lg:grid-cols-[1fr_auto_auto] lg:items-end"><div className="space-y-2"><Label htmlFor="aciona-one-search">Pesquisar contato</Label><Input id="aciona-one-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cliente, CPF/CNPJ ou telefone" /></div><div className="space-y-2"><Label htmlFor="aciona-one-vendor">Filtrar por vendedor</Label><Select value={vendor} onValueChange={setVendor}><SelectTrigger id="aciona-one-vendor" className="w-full lg:w-52"><SelectValue placeholder="Todos os vendedores" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os vendedores</SelectItem>{vendors.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="aciona-one-density">Tamanho da lista</Label><Select value={density} onValueChange={value => setDensity(value as ListDensity)}><SelectTrigger id="aciona-one-density" className="w-full lg:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compact">Compacto</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="comfortable">Amplo</SelectItem></SelectContent></Select></div></div><div className="aciona-one-actions flex flex-col gap-3 rounded-2xl border border-dashed border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-extrabold"><SlidersHorizontal className="h-4 w-4 text-primary" />Colunas e grades</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{CALLING_LIST_COLUMNS.map(column => <label key={column} className="flex cursor-pointer items-center gap-2 text-xs font-semibold"><Checkbox checked={visibleColumns.includes(column)} onCheckedChange={checked => toggleColumn(column, checked === true)} />{CALLING_LIST_LABELS[column]}</label>)}</div></div><label className="flex cursor-pointer items-center gap-2 text-sm font-bold"><Checkbox checked={showGrid} onCheckedChange={checked => setShowGrid(checked === true)} /><Grid3X3 className="h-4 w-4 text-primary" />Exibir grades</label></div></CardHeader><CardContent className="pt-5"><div id="aciona-one-print"><div className="mb-4 hidden print:block"><h2 className="text-xl font-black">Lista de acionamento</h2><p className="text-xs text-muted-foreground">{vendor === "all" ? "Todos os vendedores" : `Vendedor: ${vendor}`} · {displayedRows.length} contato(s)</p></div>{rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border/80 py-12 text-center"><FileSpreadsheet className="mx-auto h-9 w-9 text-primary" /><p className="mt-3 font-extrabold">Importe a planilha para montar a lista.</p><p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">Serão selecionadas as colunas Vendedor, Atraso, Valor Vencido, CPF/CNPJ Cliente, Cliente e os telefones móveis disponíveis.</p></div> : <><div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs"><p className="font-bold text-muted-foreground"><ListFilter className="mr-1 inline h-3.5 w-3.5" />{displayedRows.length} de {rows.length} contato(s) exibido(s)</p><p className="aciona-one-actions text-muted-foreground">Edite qualquer célula antes de exportar ou imprimir.</p></div><div className="overflow-x-auto rounded-2xl border border-border/70"><table className={`w-full border-collapse ${densityClasses[density]} ${showGrid ? "[&_td]:border-r [&_td]:border-b [&_th]:border-r [&_th]:border-b" : ""}`}><thead className="bg-muted/60"><tr>{visibleColumns.map(column => <th key={column} className={`${columnWidths[column]} text-left text-[10px] font-black uppercase tracking-[.1em] text-muted-foreground`}>{CALLING_LIST_LABELS[column]}</th>)}<th className="aciona-one-actions w-12 px-2 text-center text-[10px] font-black uppercase tracking-[.1em] text-muted-foreground">Ação</th></tr></thead><tbody>{displayedRows.map(row => <tr key={row.id} className="bg-card align-top hover:bg-muted/25">{visibleColumns.map(column => <td key={column} className={columnWidths[column]}><Input aria-label={`${CALLING_LIST_LABELS[column]} de ${row.customer || "contato"}`} value={row[column]} onChange={event => updateRow(row.id, column, event.target.value)} /></td>)}<td className="aciona-one-actions px-2 text-center"><Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir contato" onClick={() => removeRow(row.id)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div>{displayedRows.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">Nenhum contato corresponde ao filtro escolhido.</div>}</>}</div></CardContent></Card>;
}
