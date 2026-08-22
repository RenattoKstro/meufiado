import { useAuth } from "@/_core/hooks/useAuth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppTexts } from "@/contexts/AppTextContext";
import RomaneioTool from "@/components/RomaneioTool";
import { trpc } from "@/lib/trpc";
import { formatPastedCurrency, parsePastedCurrency } from "@shared/currencyInput";
import { calculateNinetyPercent } from "@shared/ninetyCalculator";
import { Archive, Calculator, ClipboardSignature, Clock3, Download, ExternalLink, File, FileAudio, FileImage, FileText, FileVideo, FileWarning, LayoutGrid, List, PencilLine, Pin, Plus, Rows3, ScrollText, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type DownloadItem = { id: number; title: string; fileType: string; externalUrl: string; isPinned: boolean; isVisible: boolean; updatedAt: Date | string };
type ReportItem = { id: number; title: string; description: string; isVisible: boolean };
type ViewMode = "cards" | "list" | "compact";

const FILE_TYPE_HINTS = "PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, EXE, RAR, ZIP, MP3, MP4, JPG, JPEG, PNG, TIFF, GIF, CSV, TXT";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function fileIcon(fileType: string) {
  const type = fileType.toLowerCase();
  if (["jpg", "jpeg", "png", "tiff", "gif", "webp"].includes(type)) return FileImage;
  if (["mp3", "wav", "ogg", "m4a"].includes(type)) return FileAudio;
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(type)) return FileVideo;
  if (["zip", "rar", "7z", "tar", "gz"].includes(type)) return Archive;
  if (["exe", "msi", "apk", "dmg"].includes(type)) return FileWarning;
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt"].includes(type)) return FileText;
  return File;
}

function BulletDescription({ description }: { description: string }) {
  return <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{description.split("\n").filter(Boolean).map((line, index) => {
    const bullet = /^\s*[-*•]\s+/.test(line);
    const content = line.replace(/^\s*[-*•]\s+/, "");
    return bullet ? <div key={`${line}-${index}`} className="flex gap-2"><span className="mt-0.5 text-primary">•</span><span>{content}</span></div> : <p key={`${line}-${index}`}>{line}</p>;
  })}</div>;
}

function DownloadDialog({ item, onComplete, children }: { item?: DownloadItem; onComplete: () => Promise<unknown>; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item?.title ?? "");
  const [fileType, setFileType] = useState(item?.fileType ?? "PDF");
  const [externalUrl, setExternalUrl] = useState(item?.externalUrl ?? "");
  const [isPinned, setIsPinned] = useState(item?.isPinned ?? false);
  const [isVisible, setIsVisible] = useState(item?.isVisible ?? true);
  const createMutation = trpc.utilityAdmin.createDownload.useMutation();
  const updateMutation = trpc.utilityAdmin.updateDownload.useMutation();

  useEffect(() => {
    if (!open) return;
    setTitle(item?.title ?? "");
    setFileType(item?.fileType ?? "PDF");
    setExternalUrl(item?.externalUrl ?? "");
    setIsPinned(item?.isPinned ?? false);
    setIsVisible(item?.isVisible ?? true);
  }, [item, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const data = { title: title.trim(), fileType: fileType.trim().toUpperCase(), externalUrl: externalUrl.trim(), isPinned, isVisible };
    try {
      if (item) await updateMutation.mutateAsync({ id: item.id, data });
      else await createMutation.mutateAsync(data);
      await onComplete();
      setOpen(false);
      toast.success(item ? "Download atualizado." : "Download publicado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o download.");
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[1.6rem] sm:max-w-xl">
      <DialogHeader><DialogTitle>{item ? "Editar download" : "Novo download"}</DialogTitle><DialogDescription>Cadastre um link externo seguro e escolha como ele será mostrado aos usuários.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2"><Label htmlFor="download-title">Nome do arquivo</Label><Input id="download-title" value={title} maxLength={180} onChange={event => setTitle(event.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor="download-type">Tipo de arquivo</Label><Input id="download-type" value={fileType} list="utility-file-types" maxLength={32} onChange={event => setFileType(event.target.value)} required /><datalist id="utility-file-types">{FILE_TYPE_HINTS.split(", ").map(type => <option value={type} key={type} />)}</datalist></div>
        <div className="space-y-2"><Label htmlFor="download-link">Link externo para baixar</Label><Input id="download-link" type="url" value={externalUrl} maxLength={2048} onChange={event => setExternalUrl(event.target.value)} placeholder="https://..." required /></div>
        <div className="grid gap-3 rounded-2xl bg-muted/45 p-4 sm:grid-cols-2"><label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">Fixar no topo <Switch checked={isPinned} onCheckedChange={setIsPinned} /></label><label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">Visível aos usuários <Switch checked={isVisible} onCheckedChange={setIsVisible} /></label></div>
        <Button className="w-full" type="submit" disabled={pending}>{pending ? "Salvando…" : item ? "Salvar alterações" : "Publicar download"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

function ReportDialog({ item, onComplete, children }: { item?: ReportItem; onComplete: () => Promise<unknown>; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [isVisible, setIsVisible] = useState(item?.isVisible ?? true);
  const createMutation = trpc.utilityAdmin.createReport.useMutation();
  const updateMutation = trpc.utilityAdmin.updateReport.useMutation();

  useEffect(() => {
    if (!open) return;
    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
    setIsVisible(item?.isVisible ?? true);
  }, [item, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const data = { title: title.trim(), description: description.trim(), isVisible };
    try {
      if (item) await updateMutation.mutateAsync({ id: item.id, data });
      else await createMutation.mutateAsync(data);
      await onComplete();
      setOpen(false);
      toast.success(item ? "Relatório atualizado." : "Relatório publicado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o relatório.");
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[1.6rem] sm:max-w-xl">
      <DialogHeader><DialogTitle>{item ? "Editar relatório" : "Novo relatório"}</DialogTitle><DialogDescription>O título fica em destaque e o texto aparece ao usuário quando ele abrir o relatório.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2"><Label htmlFor="report-title">Título</Label><Input id="report-title" value={title} maxLength={180} onChange={event => setTitle(event.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor="report-description">Descrição</Label><Textarea id="report-description" value={description} maxLength={10_000} onChange={event => setDescription(event.target.value)} placeholder={"Escreva os detalhes do relatório.\n- Use hífen, asterisco ou bolinha para criar marcadores."} className="min-h-44" required /></div>
        <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-muted/45 p-4 text-sm font-semibold">Visível aos usuários <Switch checked={isVisible} onCheckedChange={setIsVisible} /></label>
        <Button className="w-full" type="submit" disabled={pending}>{pending ? "Salvando…" : item ? "Salvar alterações" : "Publicar relatório"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

function NinetyCalculator() {
  const [receivable, setReceivable] = useState("");
  const [received, setReceived] = useState("");
  const values = useMemo(() => calculateNinetyPercent(parsePastedCurrency(receivable), parsePastedCurrency(received)), [receivable, received]);
  const isReached = values.totalReceivable > 0 && values.result <= 0;
  const normalize = (setter: (value: string) => void) => (event: React.ClipboardEvent<HTMLInputElement>) => { event.preventDefault(); setter(formatPastedCurrency(event.clipboardData.getData("text"))); };
  return <Card className="rounded-[1.7rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" />Calculadora 90%</CardTitle><CardDescription>Calcule quanto falta para alcançar 90% do total a receber.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="total-receber">Total a receber</Label><Input id="total-receber" inputMode="decimal" value={receivable} onChange={event => setReceivable(event.target.value)} onPaste={normalize(setReceivable)} onBlur={() => setReceivable(current => formatPastedCurrency(current))} placeholder="Ex.: 178.472,02" /></div><div className="space-y-2"><Label htmlFor="total-recebido">Total recebido</Label><Input id="total-recebido" inputMode="decimal" value={received} onChange={event => setReceived(event.target.value)} onPaste={normalize(setReceived)} onBlur={() => setReceived(current => formatPastedCurrency(current))} placeholder="Ex.: 144.923,84" /></div></div><div className={`rounded-2xl border p-5 ${isReached ? "border-emerald-500/25 bg-emerald-500/10" : "border-primary/15 bg-primary/5"}`}><p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Resultado</p><p className={`mt-1 text-3xl font-black ${isReached ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>{money.format(Math.abs(values.result))}</p><p className="mt-1 text-sm font-semibold">{values.totalReceivable === 0 ? "Informe o total a receber para calcular." : isReached ? "Meta de 90% atingida." : "Falta receber para atingir 90%."}</p></div></CardContent></Card>;
}

function EmptyState({ icon: Icon, title, message }: { icon: typeof Download; title: string; message: string }) {
  return <div className="py-9 text-center"><Icon className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-extrabold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{message}</p></div>;
}

export default function Utilities() {
  const { user } = useAuth();
  const texts = useAppTexts();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const downloadsQuery = trpc.utilities.downloads.useQuery();
  const reportsQuery = trpc.utilities.reports.useQuery();
  const removeDownload = trpc.utilityAdmin.deleteDownload.useMutation();
  const removeReport = trpc.utilityAdmin.deleteReport.useMutation();
  const [downloadView, setDownloadView] = useState<ViewMode>("cards");
  const downloads = (downloadsQuery.data ?? []) as DownloadItem[];
  const reports = (reportsQuery.data ?? []) as ReportItem[];
  const downloadGrid = downloadView === "cards" ? "grid gap-3 md:grid-cols-2" : "space-y-3";
  const downloadLayout = downloadView === "cards" ? "" : downloadView === "list" ? "sm:flex-row sm:items-center" : "sm:flex-row sm:items-center py-3";

  async function refreshDownloads() { await utils.utilities.downloads.invalidate(); }
  async function refreshReports() { await utils.utilities.reports.invalidate(); }
  async function deleteDownload(id: number) { if (window.confirm("Remover este download da área Utilidades?")) { try { await removeDownload.mutateAsync({ id }); await refreshDownloads(); toast.success("Download removido."); } catch { toast.error("Não foi possível remover o download."); } } }
  async function deleteReport(id: number) { if (window.confirm("Remover este relatório da área Utilidades?")) { try { await removeReport.mutateAsync({ id }); await refreshReports(); toast.success("Relatório removido."); } catch { toast.error("Não foi possível remover o relatório."); } } }
  const formatUpdatedAt = (value: Date | string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

  return <section className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Central de apoio</p><h1 className="mt-1 text-3xl font-black tracking-tight">{texts.utilitiesTitle}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{texts.utilitiesDescription}</p></div>{isAdmin && <div className="flex flex-wrap gap-2"><DownloadDialog onComplete={refreshDownloads}><Button><Plus className="mr-2 h-4 w-4" />Novo download</Button></DownloadDialog><ReportDialog onComplete={refreshReports}><Button variant="outline"><Plus className="mr-2 h-4 w-4" />Novo relatório</Button></ReportDialog></div>}</header>
    <Tabs defaultValue="downloads" className="space-y-5">
      <TabsList className="h-auto flex-wrap rounded-2xl bg-muted/55 p-1"><TabsTrigger value="downloads" className="rounded-xl px-4 py-2"><Download className="mr-2 h-4 w-4" />Downloads</TabsTrigger><TabsTrigger value="reports" className="rounded-xl px-4 py-2"><ScrollText className="mr-2 h-4 w-4" />Relatórios</TabsTrigger><TabsTrigger value="calculator" className="rounded-xl px-4 py-2"><Calculator className="mr-2 h-4 w-4" />Calculadora 90%</TabsTrigger><TabsTrigger value="romaneio" className="rounded-xl px-4 py-2"><ClipboardSignature className="mr-2 h-4 w-4" />Romaneio</TabsTrigger></TabsList>
      <TabsContent value="downloads"><Card className="rounded-[1.7rem] border-border/70 shadow-sm"><CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-primary" />Downloads disponíveis</CardTitle><CardDescription>Materiais compartilhados pela administração. Os links abrem em uma nova aba.</CardDescription></div><div className="flex rounded-xl border bg-muted/30 p-1" aria-label="Modo de visualização"><Button size="icon" variant={downloadView === "cards" ? "secondary" : "ghost"} onClick={() => setDownloadView("cards")} title="Cards"><LayoutGrid className="h-4 w-4" /></Button><Button size="icon" variant={downloadView === "list" ? "secondary" : "ghost"} onClick={() => setDownloadView("list")} title="Lista"><List className="h-4 w-4" /></Button><Button size="icon" variant={downloadView === "compact" ? "secondary" : "ghost"} onClick={() => setDownloadView("compact")} title="Compacto"><Rows3 className="h-4 w-4" /></Button></div></CardHeader><CardContent>{downloadsQuery.isLoading ? <p className="py-8 text-sm text-muted-foreground">Carregando downloads…</p> : downloadsQuery.isError ? <div className="py-8 text-center"><p className="text-sm font-bold text-destructive">Não foi possível carregar os downloads.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void downloadsQuery.refetch()}>Tentar novamente</Button></div> : downloads.length ? <div className={downloadGrid}>{downloads.map(item => { const Icon = fileIcon(item.fileType); return <article key={item.id} className={`rounded-2xl border p-4 ${downloadLayout} ${item.isVisible ? "border-border/70" : "border-dashed border-amber-500/50 bg-amber-500/5"}`}><div className="flex min-w-0 flex-1 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold">{item.title}</p>{item.isPinned && <Badge variant="secondary" className="gap-1"><Pin className="h-3 w-3" />Fixado</Badge>}{!item.isVisible && isAdmin && <Badge variant="outline">Oculto</Badge>}</div><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{item.fileType}</p><p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Alterado em {formatUpdatedAt(item.updatedAt)}</p></div></div><div className="mt-4 flex shrink-0 flex-wrap gap-2 sm:mt-0"><Button asChild size="sm"><a href={item.externalUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Abrir / baixar</a></Button>{isAdmin && <><DownloadDialog item={item} onComplete={refreshDownloads}><Button size="sm" variant="outline"><PencilLine className="mr-2 h-4 w-4" />Editar</Button></DownloadDialog><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void deleteDownload(item.id)}><Trash2 className="mr-2 h-4 w-4" />Remover</Button></>}</div></article>; })}</div> : <EmptyState icon={Download} title="Nenhum download disponível." message={isAdmin ? "Use “Novo download” para compartilhar o primeiro material." : "A administração ainda não publicou materiais."} />}</CardContent></Card></TabsContent>
      <TabsContent value="reports"><Card className="rounded-[1.7rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5 text-primary" />Relatórios</CardTitle><CardDescription>Abra um título para consultar os detalhes completos do relatório.</CardDescription></CardHeader><CardContent>{reportsQuery.isLoading ? <p className="py-8 text-sm text-muted-foreground">Carregando relatórios…</p> : reportsQuery.isError ? <div className="py-8 text-center"><p className="text-sm font-bold text-destructive">Não foi possível carregar os relatórios.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void reportsQuery.refetch()}>Tentar novamente</Button></div> : reports.length ? <Accordion type="single" collapsible className="space-y-3">{reports.map(item => <AccordionItem key={item.id} value={`report-${item.id}`} className={`rounded-2xl border px-4 ${item.isVisible ? "border-border/70" : "border-dashed border-amber-500/50 bg-amber-500/5"}`}><AccordionTrigger className="py-4 text-left text-base font-black hover:no-underline"><span className="flex items-center gap-2">{item.title}{!item.isVisible && isAdmin && <Badge variant="outline">Oculto</Badge>}</span></AccordionTrigger><AccordionContent className="pb-4"><BulletDescription description={item.description} />{isAdmin && <div className="mt-5 flex flex-wrap gap-2"><ReportDialog item={item} onComplete={refreshReports}><Button size="sm" variant="outline"><PencilLine className="mr-2 h-4 w-4" />Editar</Button></ReportDialog><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void deleteReport(item.id)}><Trash2 className="mr-2 h-4 w-4" />Remover</Button></div>}</AccordionContent></AccordionItem>)}</Accordion> : <EmptyState icon={ScrollText} title="Nenhum relatório disponível." message={isAdmin ? "Use “Novo relatório” para publicar a primeira atualização." : "A administração ainda não publicou relatórios."} />}</CardContent></Card></TabsContent>
      <TabsContent value="calculator"><NinetyCalculator /></TabsContent>
      <TabsContent value="romaneio"><RomaneioTool /></TabsContent>
    </Tabs>
  </section>;
}
