import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CheckCircle2, ClipboardSignature, Copy, Crown, ExternalLink, FileDown, Loader2, PackagePlus, Plus, Share2, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type RomaneioItem = { productCode?: string | null; productName: string; unit?: string | null; requestedQuantity: number; approvedQuantity: number; deliveredQuantity: number; notes?: string | null };
type RomaneioForm = {
  documentNumber: string;
  transferDate: string;
  originName: string;
  originBranch: string;
  originAddress: string;
  originNeighborhood: string;
  originCity: string;
  originState: string;
  originManagerName: string;
  destinationName: string;
  destinationBranch: string;
  destinationAddress: string;
  destinationNeighborhood: string;
  destinationCity: string;
  destinationState: string;
  destinationManagerName: string;
  notes: string;
  items: RomaneioItem[];
};
type RomaneioDocument = Omit<RomaneioForm, "documentNumber"> & { id: number; documentNumber?: string | null; shareToken: string; status: "draft" | "shared" | "partially_signed" | "signed"; originSignatureUrl?: string | null; destinationSignatureUrl?: string | null; originSignedAt?: Date | string | null; destinationSignedAt?: Date | string | null; createdAt: Date | string; updatedAt: Date | string };
type RomaneioSummary = Pick<RomaneioDocument, "id" | "documentNumber" | "transferDate" | "originName" | "destinationName" | "status" | "shareToken" | "updatedAt" | "originSignedAt" | "destinationSignedAt">;

const currentDate = () => new Date().toISOString().slice(0, 10);
const newItem = (): RomaneioItem => ({ productCode: "", productName: "", unit: "UN", requestedQuantity: 0, approvedQuantity: 0, deliveredQuantity: 0, notes: "" });
const blankForm = (): RomaneioForm => ({ documentNumber: "", transferDate: currentDate(), originName: "", originBranch: "", originAddress: "", originNeighborhood: "", originCity: "", originState: "", originManagerName: "", destinationName: "", destinationBranch: "", destinationAddress: "", destinationNeighborhood: "", destinationCity: "", destinationState: "", destinationManagerName: "", notes: "", items: [newItem()] });
const statusLabel = { draft: "Rascunho", shared: "Aguardando assinaturas", partially_signed: "Assinatura parcial", signed: "Concluído" };
const statusStyle = { draft: "bg-slate-500/10 text-slate-700 dark:text-slate-200", shared: "bg-amber-500/10 text-amber-700 dark:text-amber-300", partially_signed: "bg-sky-500/10 text-sky-700 dark:text-sky-300", signed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };

function compact(value: string) { return value.trim() || null; }
function formatDate(value?: Date | string | null) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Pendente"; }
function documentTitle(document: Pick<RomaneioDocument, "documentNumber" | "originName" | "destinationName">) { return document.documentNumber ? `Romaneio ${document.documentNumber}` : `${document.originName} → ${document.destinationName}`; }

async function asImageData(url?: string | null) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
  } catch { return null; }
}

export async function exportRomaneioPdf(document: RomaneioDocument) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  pdf.setFillColor(13, 93, 129);
  pdf.rect(0, 0, 210, 28, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text("ROMANEIO DE TRANSFERÊNCIA", margin, 13);
  pdf.setFontSize(9);
  pdf.text(document.documentNumber ? `Documento: ${document.documentNumber}` : "Documento de transferência", margin, 20);
  pdf.text(`Data: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${document.transferDate}T12:00:00`))}`, 150, 20);
  pdf.setTextColor(20, 20, 20);
  pdf.setFontSize(11);
  pdf.text("ORIGEM", margin, 38);
  pdf.text("DESTINO", 110, 38);
  pdf.setFontSize(9);
  const origin = [document.originName, document.originBranch && `Filial: ${document.originBranch}`, document.originAddress, [document.originNeighborhood, document.originCity, document.originState].filter(Boolean).join(" - "), `Gerente: ${document.originManagerName}`].filter(Boolean) as string[];
  const destination = [document.destinationName, document.destinationBranch && `Filial: ${document.destinationBranch}`, document.destinationAddress, [document.destinationNeighborhood, document.destinationCity, document.destinationState].filter(Boolean).join(" - "), `Gerente: ${document.destinationManagerName}`].filter(Boolean) as string[];
  origin.forEach((line, index) => pdf.text(line, margin, 44 + index * 5));
  destination.forEach((line, index) => pdf.text(line, 110, 44 + index * 5));
  const tableStart = 72;
  autoTable(pdf, { startY: tableStart, head: [["Código", "Produto", "Un.", "Solic.", "Aprov.", "Entregue", "Observações"]], body: document.items.map(item => [item.productCode || "—", item.productName, item.unit || "UN", item.requestedQuantity.toLocaleString("pt-BR"), item.approvedQuantity.toLocaleString("pt-BR"), item.deliveredQuantity.toLocaleString("pt-BR"), item.notes || "—"]), styles: { fontSize: 7.5, cellPadding: 2 }, headStyles: { fillColor: [13, 93, 129] }, columnStyles: { 1: { cellWidth: 53 }, 6: { cellWidth: 38 } } });
  let y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  if (document.notes) { pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.text("Observações", margin, y); pdf.setFont("helvetica", "normal"); const lines = pdf.splitTextToSize(document.notes, 180); pdf.text(lines, margin, y + 5); y += 8 + lines.length * 4; }
  if (y > 224) { pdf.addPage(); y = 24; }
  const [originSignature, destinationSignature] = await Promise.all([asImageData(document.originSignatureUrl), asImageData(document.destinationSignatureUrl)]);
  pdf.setDrawColor(155, 155, 155);
  pdf.line(margin, y + 18, 93, y + 18); pdf.line(110, y + 18, 196, y + 18);
  if (originSignature) pdf.addImage(originSignature, margin + 7, y, 70, 16);
  if (destinationSignature) pdf.addImage(destinationSignature, 117, y, 70, 16);
  pdf.setFontSize(8); pdf.text(document.originManagerName, margin, y + 23); pdf.text(`Origem · ${document.originSignedAt ? formatDate(document.originSignedAt) : "Aguardando assinatura"}`, margin, y + 28);
  pdf.text(document.destinationManagerName, 110, y + 23); pdf.text(`Destino · ${document.destinationSignedAt ? formatDate(document.destinationSignedAt) : "Aguardando assinatura"}`, 110, y + 28);
  pdf.save(`romaneio-${document.documentNumber || document.id}.pdf`);
}

function AddressFields({ prefix, form, change }: { prefix: "origin" | "destination"; form: RomaneioForm; change: (key: keyof RomaneioForm, value: string) => void }) {
  const label = prefix === "origin" ? "Origem" : "Destino";
  const keys = prefix === "origin" ? { name: "originName", branch: "originBranch", address: "originAddress", neighborhood: "originNeighborhood", city: "originCity", state: "originState", manager: "originManagerName" } as const : { name: "destinationName", branch: "destinationBranch", address: "destinationAddress", neighborhood: "destinationNeighborhood", city: "destinationCity", state: "destinationState", manager: "destinationManagerName" } as const;
  return <section className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-xs font-black text-primary">{prefix === "origin" ? "01" : "02"}</span><h3 className="font-black">{label}</h3></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Empresa / loja</Label><Input value={form[keys.name]} onChange={event => change(keys.name, event.target.value)} required /></div><div className="space-y-1.5"><Label>Filial</Label><Input value={form[keys.branch]} onChange={event => change(keys.branch, event.target.value)} /></div><div className="space-y-1.5 sm:col-span-2"><Label>Endereço</Label><Input value={form[keys.address]} onChange={event => change(keys.address, event.target.value)} /></div><div className="space-y-1.5"><Label>Bairro</Label><Input value={form[keys.neighborhood]} onChange={event => change(keys.neighborhood, event.target.value)} /></div><div className="space-y-1.5"><Label>Cidade</Label><Input value={form[keys.city]} onChange={event => change(keys.city, event.target.value)} /></div><div className="space-y-1.5"><Label>UF</Label><Input className="uppercase" value={form[keys.state]} maxLength={2} onChange={event => change(keys.state, event.target.value.toUpperCase())} /></div><div className="space-y-1.5"><Label>Nome do gerente</Label><Input value={form[keys.manager]} onChange={event => change(keys.manager, event.target.value)} required /></div></div></section>;
}

function RomaneioDialog({ onCreated }: { onCreated: (document: RomaneioDocument) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RomaneioForm>(blankForm);
  const create = trpc.romaneio.create.useMutation();
  useEffect(() => { if (open) setForm(blankForm()); }, [open]);
  const change = (key: keyof RomaneioForm, value: string) => setForm(current => ({ ...current, [key]: value }));
  const updateItem = (index: number, key: keyof RomaneioItem, value: string | number) => setForm(current => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const document = await create.mutateAsync({ ...form, documentNumber: compact(form.documentNumber), originBranch: compact(form.originBranch), originAddress: compact(form.originAddress), originNeighborhood: compact(form.originNeighborhood), originCity: compact(form.originCity), originState: compact(form.originState), destinationBranch: compact(form.destinationBranch), destinationAddress: compact(form.destinationAddress), destinationNeighborhood: compact(form.destinationNeighborhood), destinationCity: compact(form.destinationCity), destinationState: compact(form.destinationState), notes: compact(form.notes), items: form.items.map(item => ({ ...item, productCode: compact(item.productCode ?? ""), unit: compact(item.unit ?? ""), notes: compact(item.notes ?? "") })) });
      onCreated(document as RomaneioDocument);
      setOpen(false);
      toast.success("Romaneio salvo e pronto para compartilhamento.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o Romaneio."); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo Romaneio</Button></DialogTrigger><DialogContent className="max-h-[94vh] max-w-4xl overflow-y-auto rounded-[1.75rem]"><DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardSignature className="h-5 w-5 text-primary" />Novo Romaneio</DialogTitle><DialogDescription>Preencha a transferência, salve e compartilhe o link seguro para assinatura dos dois gerentes.</DialogDescription></DialogHeader><form className="space-y-5" onSubmit={submit}><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Número do documento</Label><Input value={form.documentNumber} maxLength={80} onChange={event => change("documentNumber", event.target.value)} placeholder="Ex.: ROM-2026-001" /></div><div className="space-y-1.5"><Label>Data da transferência</Label><Input type="date" value={form.transferDate} onChange={event => change("transferDate", event.target.value)} required /></div></div><div className="grid gap-4 lg:grid-cols-2"><AddressFields prefix="origin" form={form} change={change} /><AddressFields prefix="destination" form={form} change={change} /></div><section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-black">Itens transferidos</h3><p className="text-xs text-muted-foreground">Registre as quantidades solicitadas, aprovadas e entregues.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setForm(current => ({ ...current, items: [...current.items, newItem()] }))}><PackagePlus className="mr-2 h-4 w-4" />Adicionar item</Button></div><div className="space-y-3">{form.items.map((item, index) => <div key={index} className="rounded-2xl border border-border/70 p-3"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-black">Item {index + 1}</p>{form.items.length > 1 && <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => setForm(current => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 className="h-4 w-4" /></Button>}</div><div className="grid gap-3 sm:grid-cols-6"><div className="space-y-1.5 sm:col-span-1"><Label>Código</Label><Input value={item.productCode ?? ""} onChange={event => updateItem(index, "productCode", event.target.value)} /></div><div className="space-y-1.5 sm:col-span-2"><Label>Produto</Label><Input value={item.productName} onChange={event => updateItem(index, "productName", event.target.value)} required /></div><div className="space-y-1.5"><Label>Un.</Label><Input value={item.unit ?? "UN"} onChange={event => updateItem(index, "unit", event.target.value.toUpperCase())} maxLength={24} /></div><div className="space-y-1.5"><Label>Solic.</Label><Input type="number" min="0" step="any" value={item.requestedQuantity} onChange={event => updateItem(index, "requestedQuantity", Number(event.target.value))} /></div><div className="space-y-1.5"><Label>Aprov.</Label><Input type="number" min="0" step="any" value={item.approvedQuantity} onChange={event => updateItem(index, "approvedQuantity", Number(event.target.value))} /></div><div className="space-y-1.5"><Label>Entregue</Label><Input type="number" min="0" step="any" value={item.deliveredQuantity} onChange={event => updateItem(index, "deliveredQuantity", Number(event.target.value))} /></div><div className="space-y-1.5 sm:col-span-6"><Label>Observações do item</Label><Input value={item.notes ?? ""} maxLength={600} onChange={event => updateItem(index, "notes", event.target.value)} /></div></div></div>)}</div></section><div className="space-y-1.5"><Label>Observações gerais</Label><Textarea value={form.notes} maxLength={10_000} onChange={event => change("notes", event.target.value)} placeholder="Informações complementares sobre a transferência." /></div><Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : <><Share2 className="mr-2 h-4 w-4" />Salvar e gerar link para assinatura</>}</Button></form></DialogContent></Dialog>;
}

function RomaneioDetails({ document, onClose }: { document: RomaneioDocument; onClose: () => void }) {
  const shareUrl = `${window.location.origin}/romaneio/${document.shareToken}`;
  const copy = async () => { try { await navigator.clipboard.writeText(shareUrl); toast.success("Link seguro copiado."); } catch { toast.error("Não foi possível copiar o link."); } };
  return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-[1.75rem]"><DialogHeader><div className="flex flex-wrap items-start justify-between gap-3 pr-5"><div><DialogTitle>{documentTitle(document)}</DialogTitle><DialogDescription>{document.originName} → {document.destinationName} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(`${document.transferDate}T12:00:00`))}</DialogDescription></div><Badge className={statusStyle[document.status]}>{statusLabel[document.status]}</Badge></div></DialogHeader><div className="grid gap-3 sm:grid-cols-3"><Button onClick={copy}><Copy className="mr-2 h-4 w-4" />Copiar link</Button><Button variant="outline" onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}><ExternalLink className="mr-2 h-4 w-4" />Abrir link</Button><Button variant="outline" onClick={() => void exportRomaneioPdf(document)}><FileDown className="mr-2 h-4 w-4" />Baixar PDF</Button></div><div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm"><p className="font-black">Assinaturas</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><p><span className="font-semibold">Origem:</span> {document.originManagerName} · {formatDate(document.originSignedAt)}</p><p><span className="font-semibold">Destino:</span> {document.destinationManagerName} · {formatDate(document.destinationSignedAt)}</p></div></div><div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[620px] text-sm"><thead className="bg-muted/55 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Produto</th><th className="p-3">Un.</th><th className="p-3">Solic.</th><th className="p-3">Aprov.</th><th className="p-3">Entregue</th></tr></thead><tbody>{document.items.map((item, index) => <tr key={index} className="border-t"><td className="p-3"><p className="font-bold">{item.productName}</p><p className="text-xs text-muted-foreground">{item.productCode || "Sem código"}</p></td><td className="p-3">{item.unit || "UN"}</td><td className="p-3">{item.requestedQuantity}</td><td className="p-3">{item.approvedQuantity}</td><td className="p-3">{item.deliveredQuantity}</td></tr>)}</tbody></table></div>{document.notes && <div className="rounded-2xl bg-muted/40 p-4 text-sm"><p className="font-black">Observações</p><p className="mt-1 whitespace-pre-line text-muted-foreground">{document.notes}</p></div>}</DialogContent></Dialog>;
}

export default function RomaneioTool() {
  const utils = trpc.useUtils();
  const subscription = trpc.subscription.mine.useQuery();
  const documentsQuery = trpc.romaneio.list.useQuery(undefined, { enabled: subscription.data?.isPro || subscription.data?.plan === "pro" || subscription.data?.plan === undefined });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedQuery = trpc.romaneio.get.useQuery({ id: selectedId ?? 0 }, { enabled: selectedId !== null });
  const documents = (documentsQuery.data ?? []) as RomaneioSummary[];
  const isPro = subscription.data?.isPro ?? false;
  const totals = useMemo(() => ({ total: documents.length, signed: documents.filter(document => document.status === "signed").length, pending: documents.filter(document => document.status !== "signed").length }), [documents]);
  async function handleCreated(document: RomaneioDocument) { await utils.romaneio.list.invalidate(); setSelectedId(document.id); }
  if (subscription.isLoading) return <Card className="rounded-[1.7rem]"><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>;
  if (!isPro) return <Card className="overflow-hidden rounded-[1.7rem] border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card"><CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div><Badge className="bg-primary text-primary-foreground"><Crown className="mr-1 h-3 w-3" />PRO</Badge><h2 className="mt-3 text-xl font-black">Romaneio digital com assinaturas</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Crie transferências, gere PDF, compartilhe um link seguro e mantenha as assinaturas dos dois gerentes salvas no mesmo documento.</p></div><Button asChild><a href="/plano">Conhecer plano PRO</a></Button></CardContent></Card>;
  return <section className="space-y-5"><Card className="overflow-hidden rounded-[1.7rem] border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card"><CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between"><div><Badge className="bg-primary text-primary-foreground"><Crown className="mr-1 h-3 w-3" />Ferramenta PRO</Badge><h2 className="mt-3 flex items-center gap-2 text-2xl font-black"><ClipboardSignature className="h-6 w-6 text-primary" />Romaneio digital</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Registre a transferência, envie um link único para os dois gerentes assinarem e gere o PDF sempre que precisar.</p></div><RomaneioDialog onCreated={handleCreated} /></CardContent></Card><div className="grid gap-3 sm:grid-cols-3">{[["Documentos", totals.total, "text-primary"], ["Concluídos", totals.signed, "text-emerald-600 dark:text-emerald-400"], ["Pendentes", totals.pending, "text-amber-600 dark:text-amber-300"]].map(([label, value, color]) => <Card key={String(label)} className="rounded-2xl"><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-black ${color}`}>{value}</p></CardContent></Card>)}</div><Card className="rounded-[1.7rem]"><CardHeader><CardTitle>Romaneios salvos</CardTitle><CardDescription>O histórico fica disponível para consulta, compartilhamento e exportação em PDF.</CardDescription></CardHeader><CardContent>{documentsQuery.isLoading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div> : documents.length === 0 ? <div className="rounded-2xl border border-dashed py-12 text-center"><ClipboardSignature className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-black">Nenhum Romaneio salvo</p><p className="mt-1 text-sm text-muted-foreground">Crie o primeiro documento para gerar um link de assinatura.</p></div> : <div className="space-y-3">{documents.map(document => <button type="button" key={document.id} onClick={() => setSelectedId(document.id)} className="flex w-full flex-col gap-3 rounded-2xl border border-border/70 p-4 text-left transition hover:border-primary/35 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{documentTitle(document)}</p><p className="mt-1 text-sm text-muted-foreground">{document.originName} → {document.destinationName} · Atualizado {formatDate(document.updatedAt)}</p></div><div className="flex items-center gap-2"><Badge className={statusStyle[document.status]}>{document.status === "signed" && <CheckCircle2 className="mr-1 h-3 w-3" />}{statusLabel[document.status]}</Badge><ExternalLink className="h-4 w-4 text-muted-foreground" /></div></button>)}</div>}</CardContent></Card>{selectedQuery.data && <RomaneioDetails document={selectedQuery.data as RomaneioDocument} onClose={() => { setSelectedId(null); void utils.romaneio.list.invalidate(); }} />}</section>;
}
