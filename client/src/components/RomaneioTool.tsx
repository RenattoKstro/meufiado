import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CheckCircle2, ClipboardSignature, Copy, Crown, ExternalLink, FileDown, Loader2, PackagePlus, PenLine, Plus, Send, Share2, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type RomaneioParty = { name: string; branch: string; address: string; neighborhood: string };
type RomaneioItem = { productCode: string; productName: string; unit: string };
type RomaneioForm = { invoiceNumber: string; transferDate: string; requesting: RomaneioParty; providing: RomaneioParty; items: RomaneioItem[] };
type CatalogParty = RomaneioParty & { id: number };
type CatalogProduct = { id: number; code: string; description: string; unit: string };
export type RomaneioDocument = {
  id: number;
  documentNumber?: string | null;
  transferDate: string;
  originName: string;
  originBranch?: string | null;
  originAddress?: string | null;
  originNeighborhood?: string | null;
  originManagerName: string;
  originSignatureUrl?: string | null;
  originSignedAt?: Date | string | null;
  destinationName: string;
  destinationBranch?: string | null;
  destinationAddress?: string | null;
  destinationNeighborhood?: string | null;
  destinationManagerName: string;
  destinationSignatureUrl?: string | null;
  destinationSignedAt?: Date | string | null;
  pdfUrl?: string | null;
  shareToken: string;
  status: "draft" | "shared" | "partially_signed" | "signed";
  items: Array<RomaneioItem & { id?: number }>;
  createdAt: Date | string;
  updatedAt: Date | string;
};
type RomaneioSummary = Pick<RomaneioDocument, "id" | "documentNumber" | "transferDate" | "originName" | "destinationName" | "status" | "shareToken" | "updatedAt" | "originSignedAt" | "destinationSignedAt" | "pdfUrl">;
type Signer = "origin" | "destination";

const currentDate = () => new Date().toISOString().slice(0, 10);
const emptyParty = (): RomaneioParty => ({ name: "", branch: "", address: "", neighborhood: "" });
const newItem = (): RomaneioItem => ({ productCode: "", productName: "", unit: "UN" });
const blankForm = (): RomaneioForm => ({ invoiceNumber: "", transferDate: currentDate(), requesting: emptyParty(), providing: emptyParty(), items: [newItem()] });
const statusLabel = { draft: "Rascunho", shared: "Aguardando assinaturas", partially_signed: "Assinatura parcial", signed: "Concluído" };
const statusStyle = { draft: "bg-slate-500/10 text-slate-700 dark:text-slate-200", shared: "bg-amber-500/10 text-amber-700 dark:text-amber-300", partially_signed: "bg-sky-500/10 text-sky-700 dark:text-sky-300", signed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
const formatDate = (value?: Date | string | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Pendente";
const formatDocumentDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`));
const documentTitle = (document: Pick<RomaneioDocument, "documentNumber">) => `NF ${document.documentNumber || "sem identificação"}`;
const fromOrigin = (document: RomaneioDocument): RomaneioParty => ({ name: document.originName, branch: document.originBranch || "", address: document.originAddress || "", neighborhood: document.originNeighborhood || "" });
const fromDestination = (document: RomaneioDocument): RomaneioParty => ({ name: document.destinationName, branch: document.destinationBranch || "", address: document.destinationAddress || "", neighborhood: document.destinationNeighborhood || "" });

export function generateNameSignature(name: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1100;
  canvas.height = 260;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a assinatura.");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111111";
  context.font = 'italic 92px "Brush Script MT", "Segoe Script", cursive';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(name.trim() || "Assinatura", canvas.width / 2, canvas.height / 2 + 6, canvas.width - 80);
  return canvas.toDataURL("image/png");
}

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
  const width = pdf.internal.pageSize.getWidth();
  const margin = 12;
  let y = 10;
  const darkBlue: [number, number, number] = [0, 0, 139];
  const red: [number, number, number] = [220, 20, 20];

  pdf.setTextColor(...darkBlue);
  pdf.setFont("times", "bolditalic");
  pdf.setFontSize(23);
  pdf.text("MEU FIADO", width / 2, y + 8, { align: "center" });
  pdf.setDrawColor(...red);
  pdf.setLineWidth(0.6);
  pdf.line(width / 2 - 19, y + 10.5, width / 2 + 19, y + 10.5);
  y += 15;

  const sectionHeading = (title: string, height = 8) => {
    pdf.setFillColor(...darkBlue);
    pdf.setDrawColor(...red);
    pdf.setLineWidth(0.6);
    pdf.rect(margin, y, width - margin * 2, height, "FD");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(title, width / 2, y + 5.4, { align: "center" });
    y += height;
  };
  const partyTable = (label: string, party: RomaneioParty) => {
    autoTable(pdf, {
      startY: y,
      margin: { left: margin, right: margin },
      body: [[label, party.name], ["FILIAL:", party.branch], ["ENDEREÇO:", party.address], ["BAIRRO:", party.neighborhood]],
      theme: "grid",
      styles: { fontSize: 8.2, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.12, cellPadding: 1.25, minCellHeight: 5.25 },
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;
  };

  sectionHeading("ROMANEIO DE TRANSFERÊNCIA");
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("NF:", margin, y + 5);
  pdf.setFont("helvetica", "normal");
  pdf.text(document.documentNumber || "—", margin + 10, y + 5);
  pdf.setFont("helvetica", "bold");
  pdf.text("DATA:", width - margin - 36, y + 5);
  pdf.setFont("helvetica", "normal");
  pdf.text(formatDocumentDate(document.transferDate), width - margin - 20, y + 5);
  y += 9;

  sectionHeading("FILIAL QUE SOLICITA");
  partyTable("QUEM SOLICITA", fromDestination(document));
  sectionHeading("FILIAL QUE FORNECE");
  partyTable("QUEM FORNECE", fromOrigin(document));
  sectionHeading("DADOS DOS PRODUTOS DA TRANSFERÊNCIA");
  autoTable(pdf, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["CÓDIGO", "DESCRIÇÃO", "UND"]],
    body: document.items.map(item => [item.productCode || "", item.productName, item.unit || "UN"]),
    theme: "grid",
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.12, cellPadding: 1.25, halign: "center" },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 40 }, 1: { halign: "left" }, 2: { cellWidth: 21 } },
  });
  y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  if (y > 235) { pdf.addPage(); y = 30; }
  const [requestingSignature, providingSignature] = await Promise.all([asImageData(document.destinationSignatureUrl), asImageData(document.originSignatureUrl)]);
  const signatureLine = (signature: string | null, label: string, name: string) => {
    const signatureWidth = 58;
    const x = (width - signatureWidth) / 2;
    if (signature) pdf.addImage(signature, "PNG", x, y - 13, signatureWidth, 14);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.28);
    pdf.line(x, y, x + signatureWidth, y);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text(label, width / 2, y + 3.5, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.8);
    pdf.text(name, width / 2, y + 6.7, { align: "center" });
    y += 19;
  };
  signatureLine(requestingSignature, "Gerente que Solicita", document.destinationManagerName);
  signatureLine(providingSignature, "Gerente que Fornece", document.originManagerName);

  const pdfDataUrl = pdf.output("datauristring") as string;
  pdf.save(`romaneio-nf-${document.documentNumber || document.id}.pdf`);
  return { pdfDataUrl };
}

function PartyFields({ title, party, catalog, onChange }: { title: string; party: RomaneioParty; catalog: CatalogParty[]; onChange: (party: RomaneioParty) => void }) {
  const fillByName = (value: string) => {
    const found = catalog.find(entry => normalize(entry.name) === normalize(value));
    onChange(found ? { name: found.name, branch: found.branch, address: found.address, neighborhood: found.neighborhood } : { ...party, name: value.toLocaleUpperCase("pt-BR") });
  };
  const fillByBranch = (value: string) => {
    const found = catalog.find(entry => normalize(entry.branch) === normalize(value));
    onChange(found ? { name: found.name, branch: found.branch, address: found.address, neighborhood: found.neighborhood } : { ...party, branch: value.toLocaleUpperCase("pt-BR") });
  };
  return <section className="space-y-3 rounded-lg border border-slate-300 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/20"><h3 className="border-l-4 border-red-700 bg-blue-950 px-3 py-1.5 text-center text-sm font-black text-white">{title}</h3><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Quem {title.includes("SOLICITA") ? "solicita" : "fornece"} *</Label><Input list="romaneio-party-names" value={party.name} onChange={event => fillByName(event.target.value)} required /></div><div className="space-y-1.5"><Label>Filial</Label><Input list="romaneio-party-branches" value={party.branch} onChange={event => fillByBranch(event.target.value)} /></div><div className="space-y-1.5"><Label>Endereço</Label><Input value={party.address} onChange={event => onChange({ ...party, address: event.target.value.toLocaleUpperCase("pt-BR") })} /></div><div className="space-y-1.5"><Label>Bairro</Label><Input value={party.neighborhood} onChange={event => onChange({ ...party, neighborhood: event.target.value.toLocaleUpperCase("pt-BR") })} /></div></div></section>;
}

function RomaneioDialog({ onCreated }: { onCreated: (document: RomaneioDocument) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RomaneioForm>(blankForm);
  const create = trpc.romaneio.create.useMutation();
  const catalogParties = trpc.romaneio.parties.useQuery(undefined, { enabled: open });
  const catalogProducts = trpc.romaneio.products.useQuery(undefined, { enabled: open });
  const parties = (catalogParties.data ?? []) as CatalogParty[];
  const products = (catalogProducts.data ?? []) as CatalogProduct[];
  useEffect(() => { if (open) setForm(blankForm()); }, [open]);
  const updateItem = (index: number, patch: Partial<RomaneioItem>) => setForm(current => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  const findProduct = (code: string) => products.find(product => normalize(product.code) === normalize(code));
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const document = await create.mutateAsync({
        invoiceNumber: form.invoiceNumber.trim(),
        transferDate: form.transferDate,
        requesting: { name: form.requesting.name.trim(), branch: form.requesting.branch.trim() || null, address: form.requesting.address.trim() || null, neighborhood: form.requesting.neighborhood.trim() || null },
        providing: { name: form.providing.name.trim(), branch: form.providing.branch.trim() || null, address: form.providing.address.trim() || null, neighborhood: form.providing.neighborhood.trim() || null },
        items: form.items.map(item => ({ productCode: item.productCode.trim(), productName: item.productName.trim(), unit: item.unit.trim() || "UN" })),
      });
      onCreated(document as RomaneioDocument);
      setOpen(false);
      toast.success("Romaneio salvo. Escolha seu papel e gere sua assinatura para continuar.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o Romaneio."); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo Romaneio</Button></DialogTrigger><DialogContent className="max-h-[94vh] max-w-4xl overflow-y-auto rounded-[1.25rem]"><DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardSignature className="h-5 w-5 text-primary" />Novo Romaneio</DialogTitle><DialogDescription>Os dados digitados passam a integrar o catálogo compartilhado para preencher os próximos documentos.</DialogDescription></DialogHeader><form className="space-y-5" onSubmit={submit}><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Nota Fiscal *</Label><Input value={form.invoiceNumber} maxLength={80} onChange={event => setForm(current => ({ ...current, invoiceNumber: event.target.value }))} placeholder="Informe a NF" required /></div><div className="space-y-1.5"><Label>Data</Label><Input type="date" value={form.transferDate} onChange={event => setForm(current => ({ ...current, transferDate: event.target.value }))} required /></div></div><PartyFields title="FILIAL QUE SOLICITA" party={form.requesting} catalog={parties} onChange={requesting => setForm(current => ({ ...current, requesting }))} /><PartyFields title="FILIAL QUE FORNECE" party={form.providing} catalog={parties} onChange={providing => setForm(current => ({ ...current, providing }))} /><datalist id="romaneio-party-names">{parties.map(party => <option key={`${party.id}-name`} value={party.name} />)}</datalist><datalist id="romaneio-party-branches">{Array.from(new Set(parties.map(party => party.branch).filter(Boolean))).map(branch => <option key={branch} value={branch} />)}</datalist><section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-black">Dados dos produtos da transferência</h3><p className="text-xs text-muted-foreground">Informe código, descrição e UND conforme o modelo.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setForm(current => ({ ...current, items: [...current.items, newItem()] }))}><PackagePlus className="mr-2 h-4 w-4" />Adicionar produto</Button></div><div className="space-y-3">{form.items.map((item, index) => <div key={index} className="rounded-lg border border-border/70 p-3"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-black">Produto {index + 1}</p>{form.items.length > 1 && <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => setForm(current => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 className="h-4 w-4" /></Button>}</div><div className="grid gap-3 sm:grid-cols-12"><div className="space-y-1.5 sm:col-span-3"><Label>Código *</Label><Input list="romaneio-product-codes" value={item.productCode} onChange={event => { const product = findProduct(event.target.value); updateItem(index, product ? { productCode: product.code, productName: product.description, unit: product.unit } : { productCode: event.target.value.toLocaleUpperCase("pt-BR") }); }} required /></div><div className="space-y-1.5 sm:col-span-7"><Label>Descrição</Label><Input list="romaneio-product-descriptions" value={item.productName} onChange={event => { const product = products.find(entry => normalize(entry.description) === normalize(event.target.value)); updateItem(index, product ? { productCode: product.code, productName: product.description, unit: product.unit } : { productName: event.target.value.toLocaleUpperCase("pt-BR") }); }} required /></div><div className="space-y-1.5 sm:col-span-2"><Label>UND</Label><Input value={item.unit} onChange={event => updateItem(index, { unit: event.target.value.toLocaleUpperCase("pt-BR") })} maxLength={24} required /></div></div></div>)}</div><datalist id="romaneio-product-codes">{products.map(product => <option key={product.id} value={product.code}>{product.description}</option>)}</datalist><datalist id="romaneio-product-descriptions">{products.map(product => <option key={`${product.id}-description`} value={product.description}>{product.code}</option>)}</datalist></section><Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : <><Share2 className="mr-2 h-4 w-4" />Salvar Romaneio</>}</Button></form></DialogContent></Dialog>;
}

function RomaneioDetails({ document, onClose }: { document: RomaneioDocument; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [role, setRole] = useState<Signer | null>(null);
  const sign = trpc.romaneio.sign.useMutation();
  const savePdf = trpc.romaneio.savePdf.useMutation();
  const shareUrl = `${window.location.origin}/romaneio/${document.shareToken}`;
  const ownSigned = role === "origin" ? Boolean(document.originSignedAt) : role === "destination" ? Boolean(document.destinationSignedAt) : false;
  const counterpart = role === "origin" ? "solicita" : "fornece";
  const roleName = role === "origin" ? document.originManagerName : document.destinationManagerName;
  const copy = async () => { try { await navigator.clipboard.writeText(shareUrl); toast.success("Link seguro copiado."); } catch { toast.error("Não foi possível copiar o link."); } };
  const signWithName = async () => {
    if (!role) return toast.error("Escolha se você está enviando ou solicitando.");
    try {
      await sign.mutateAsync({ token: document.shareToken, signer: role, signatureDataUrl: generateNameSignature(roleName) });
      await utils.romaneio.get.invalidate({ id: document.id });
      await utils.romaneio.list.invalidate();
      toast.success("Sua assinatura foi gerada e registrada.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar a assinatura."); }
  };
  const downloadAndSave = async () => {
    try {
      const { pdfDataUrl } = await exportRomaneioPdf(document);
      await savePdf.mutateAsync({ id: document.id, pdfDataUrl });
      await utils.romaneio.get.invalidate({ id: document.id });
      await utils.romaneio.list.invalidate();
      toast.success("PDF gerado, baixado e salvo no histórico.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF."); }
  };
  return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-[1.25rem]"><DialogHeader><div className="flex flex-wrap items-start justify-between gap-3 pr-5"><div><DialogTitle>{documentTitle(document)}</DialogTitle><DialogDescription>{document.destinationName} solicita de {document.originName} · {formatDocumentDate(document.transferDate)}</DialogDescription></div><Badge className={statusStyle[document.status]}>{statusLabel[document.status]}</Badge></div></DialogHeader><div className="rounded-lg border border-primary/20 bg-primary/5 p-4"><p className="font-black">1. Informe seu papel no Romaneio</p><p className="mt-1 text-sm text-muted-foreground">A assinatura é gerada visualmente a partir do nome preenchido no documento.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><Button type="button" variant={role === "origin" ? "default" : "outline"} onClick={() => setRole("origin")}>Estou enviando <span className="ml-1 text-xs opacity-80">({document.originManagerName})</span></Button><Button type="button" variant={role === "destination" ? "default" : "outline"} onClick={() => setRole("destination")}>Estou solicitando <span className="ml-1 text-xs opacity-80">({document.destinationManagerName})</span></Button></div>{role && <div className="mt-3 rounded-md bg-background/80 p-3 text-sm"><p><span className="font-bold">Sua assinatura:</span> {roleName}</p><p className="mt-1 text-muted-foreground">Após assinar, gere o Romaneio e envie este mesmo link ao gerente que {counterpart} para a segunda assinatura.</p>{ownSigned ? <p className="mt-2 flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Sua assinatura já está registrada.</p> : <Button className="mt-3" onClick={() => void signWithName()} disabled={sign.isPending}>{sign.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando…</> : <><PenLine className="mr-2 h-4 w-4" />Gerar minha assinatura</>}</Button>}</div>}</div>{ownSigned && <div className="grid gap-2 sm:grid-cols-3"><Button onClick={() => void downloadAndSave()} disabled={savePdf.isPending}><FileDown className="mr-2 h-4 w-4" />Gerar e baixar</Button><Button variant="outline" onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" />Copiar link</Button><Button variant="outline" onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}><Send className="mr-2 h-4 w-4" />Enviar para assinar</Button></div>}{document.pdfUrl && <Button variant="link" className="h-auto p-0 text-sm" asChild><a href={document.pdfUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" />Abrir PDF salvo no histórico</a></Button>}<div className="rounded-lg border border-slate-300 dark:border-slate-700"><div className="border-b bg-blue-950 px-3 py-2 text-center text-sm font-black text-white">DADOS DOS PRODUTOS DA TRANSFERÊNCIA</div><table className="w-full text-sm"><thead className="border-b text-left text-xs uppercase"><tr><th className="p-2 text-center">Código</th><th className="p-2">Descrição</th><th className="p-2 text-center">UND</th></tr></thead><tbody>{document.items.map((item, index) => <tr key={index} className="border-t"><td className="p-2 text-center">{item.productCode || "—"}</td><td className="p-2 font-medium">{item.productName}</td><td className="p-2 text-center">{item.unit || "UN"}</td></tr>)}</tbody></table></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-muted/45 p-3 text-sm"><p className="font-black">Gerente que solicita</p><p>{document.destinationManagerName}</p><p className="mt-1 text-muted-foreground">{formatDate(document.destinationSignedAt)}</p></div><div className="rounded-lg bg-muted/45 p-3 text-sm"><p className="font-black">Gerente que fornece</p><p>{document.originManagerName}</p><p className="mt-1 text-muted-foreground">{formatDate(document.originSignedAt)}</p></div></div></DialogContent></Dialog>;
}

export default function RomaneioTool() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const subscription = trpc.subscription.mine.useQuery();
  const isAdmin = user?.role === "admin";
  const hasProAccess = isAdmin || subscription.data?.isPro === true || subscription.data?.plan === "pro";
  const documentsQuery = trpc.romaneio.list.useQuery(undefined, { enabled: hasProAccess });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedQuery = trpc.romaneio.get.useQuery({ id: selectedId ?? 0 }, { enabled: selectedId !== null && hasProAccess });
  const documents = (documentsQuery.data ?? []) as RomaneioSummary[];
  const totals = useMemo(() => ({ total: documents.length, signed: documents.filter(document => document.status === "signed").length, pending: documents.filter(document => document.status !== "signed").length }), [documents]);
  const handleCreated = async (document: RomaneioDocument) => { await utils.romaneio.list.invalidate(); setSelectedId(document.id); };
  if (subscription.isLoading && !isAdmin) return <Card className="rounded-[1.25rem]"><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>;
  if (!hasProAccess) return <Card className="overflow-hidden rounded-[1.25rem] border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card"><CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div><Badge className="bg-primary text-primary-foreground"><Crown className="mr-1 h-3 w-3" />PRO</Badge><h2 className="mt-3 text-xl font-black">Romaneio com assinaturas e PDF</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Crie transferências, salve dados reutilizáveis e acompanhe as assinaturas dos dois gerentes.</p></div><Button asChild><a href="/plano">Conhecer plano PRO</a></Button></CardContent></Card>;
  return <section className="space-y-5"><Card className="overflow-hidden rounded-[1.25rem] border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card"><CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between"><div><Badge className="bg-primary text-primary-foreground"><Crown className="mr-1 h-3 w-3" />Ferramenta PRO</Badge><h2 className="mt-3 flex items-center gap-2 text-2xl font-black"><ClipboardSignature className="h-6 w-6 text-primary" />Romaneio de transferência</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Use Nota Fiscal, filiais e produtos do catálogo compartilhado; assine pelo nome e envie o link seguro para o outro gerente.</p></div><RomaneioDialog onCreated={handleCreated} /></CardContent></Card><div className="grid gap-3 sm:grid-cols-3">{[["Documentos", totals.total, "text-primary"], ["Concluídos", totals.signed, "text-emerald-600 dark:text-emerald-400"], ["Pendentes", totals.pending, "text-amber-600 dark:text-amber-300"]].map(([label, value, color]) => <Card key={String(label)} className="rounded-xl"><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-black ${color}`}>{value}</p></CardContent></Card>)}</div><Card className="rounded-[1.25rem]"><CardHeader><CardTitle>Romaneios salvos</CardTitle><CardDescription>O histórico mantém o documento, o link de assinatura e o PDF gerado.</CardDescription></CardHeader><CardContent>{documentsQuery.isLoading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div> : documents.length === 0 ? <div className="rounded-xl border border-dashed py-12 text-center"><ClipboardSignature className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-black">Nenhum Romaneio salvo</p><p className="mt-1 text-sm text-muted-foreground">Crie o primeiro documento para gerar o link de assinatura.</p></div> : <div className="space-y-3">{documents.map(document => <button type="button" key={document.id} onClick={() => setSelectedId(document.id)} className="flex w-full flex-col gap-3 rounded-xl border border-border/70 p-4 text-left transition hover:border-primary/35 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{documentTitle(document)}</p><p className="mt-1 text-sm text-muted-foreground">{document.destinationName} solicita de {document.originName} · Atualizado {formatDate(document.updatedAt)}</p></div><div className="flex items-center gap-2">{document.pdfUrl && <FileDown className="h-4 w-4 text-emerald-600" />}<Badge className={statusStyle[document.status]}>{document.status === "signed" && <CheckCircle2 className="mr-1 h-3 w-3" />}{statusLabel[document.status]}</Badge><ExternalLink className="h-4 w-4 text-muted-foreground" /></div></button>)}</div>}</CardContent></Card>{selectedQuery.data && <RomaneioDetails document={selectedQuery.data as RomaneioDocument} onClose={() => { setSelectedId(null); void utils.romaneio.list.invalidate(); }} />}</section>;
}
