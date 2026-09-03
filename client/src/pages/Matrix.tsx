import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { comparisonCodesFromSearch, comparisonEffectivenessHighlights, sortMatrixItemsByComparisonCodes, sortMatrixItemsForDisplay, type ComparisonEffectivenessHighlight, type MatrixSortOption } from "@shared/matrixComparison";
import { matrixReceivedAmount } from "@shared/goalRules";
import { Building2, ChevronDown, CircleAlert, Clock3, Database, ListFilter, Search, Target, TrendingDown, X } from "lucide-react";
import { useMemo, useState } from "react";

type MatrixItem = {
  branch: { id: number; name: string; code: string | null; regional: string | null };
  metrics: {
    creditGoal: number;
    challengeGoal: number;
    received: number;
    currentOverdue: number;
    delinquencyPercent: number;
    creditEffectivenessPercent: number;
    challengeEffectivenessPercent: number;
    ticketGoal: number;
    ticketPercent: number;
    ticketBonus: number;
    monthlyLoss: number;
    lossSalesPercent: number;
    lostGoal: number;
    lostReceived: number;
    lossEffectivenessPercent: number;
    amountReceivable: number;
    overdueOpening: number;
    portfolioTotal: number;
    receiptForecast: number;
    closingForecast: number;
    closingForecastPercent: number;
    accumulatedLossGoal: number;
    accumulatedLossReceived: number;
    accumulatedLossBalance: number;
    previousDayGoal: number;
    dailyReceived: number;
    previousDayDifference: number;
    accumulatedDifference: number;
    redesignedDailyGoal: number;
    challengeDailyReceivedJson: string | null;
    sales: number;
    receiptDailyJson: string | null;
  } | null;
  updatedAt: Date | null;
};

type MatrixImportSource = {
  source: "analytic" | "data" | "dailyTracking" | "challengeDaily" | "receiptDaily";
  importedAt: Date;
  receivedRows: number;
  validRows: number;
};

const sourceLabels: Record<MatrixImportSource["source"], string> = {
  analytic: "Analítico",
  data: "Dados",
  dailyTracking: "Acomp. Meta Diária",
  challengeDaily: "Meta Desafio Diária",
  receiptDaily: "Recebimento diário",
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const compactMoney = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(value);
const imported = (item: MatrixItem) => item.metrics !== null;
const percent = (value: number) => `${(Math.abs(value) > 0 && Math.abs(value) <= 1 ? value * 100 : value).toFixed(2)}%`;
function challengeDailyValues(value: string | null) {
  try { const parsed: unknown = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed.map(item => Number(item) || 0).slice(0, 31) : []; } catch { return []; }
}
function receiptDailyValues(value: string | null) {
  try {
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 31).map(item => typeof item === "number" && Number.isFinite(item) ? item : null) : [];
  } catch { return []; }
}

function updateLabel(value: Date | null) {
  if (!value) return "Aguardando importação";
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Importado agora";
  if (minutes < 60) return `Importado há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Importado há ${hours} h`;
  return `Importado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))}`;
}

function sourceUpdateLabel(value: Date | string | null | undefined) {
  if (!value) return "Aguardando importação";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function Matrix() {
  const matrixQuery = trpc.matrix.overview.useQuery();
  const importStatusQuery = trpc.matrix.importStatus.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [regional, setRegional] = useState("all");
  const [hidePending, setHidePending] = useState(false);
  const [sortOption, setSortOption] = useState<MatrixSortOption>("numeric");
  const [expanded, setExpanded] = useState<number | null>(null);

  const items = (matrixQuery.data ?? []) as MatrixItem[];
  const comparisonCodes = useMemo(() => comparisonCodesFromSearch(searchTerm), [searchTerm]);
  const isComparing = comparisonCodes.length >= 2;
  const regionalOptions = useMemo(() => Array.from(new Set(items.map(item => item.branch.regional).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "pt-BR")), [items]);
  const visibleItems = useMemo(() => {
    if (isComparing) return sortMatrixItemsByComparisonCodes(items, comparisonCodes);
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
    const filteredItems = items.filter(item => {
      if (hidePending && !imported(item)) return false;
      if (regional !== "all" && item.branch.regional !== regional) return false;
      if (!normalizedSearch) return true;
      return [item.branch.name, item.branch.code, item.branch.regional].filter(Boolean).some(value => value!.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
    });
    return sortMatrixItemsForDisplay(filteredItems, sortOption);
  }, [comparisonCodes, hidePending, isComparing, items, regional, searchTerm, sortOption]);
  const effectivenessHighlights = useMemo(() => isComparing ? comparisonEffectivenessHighlights(visibleItems) : new Map<number, ComparisonEffectivenessHighlight>(), [isComparing, visibleItems]);
  const comparisonGridColumns = comparisonCodes.length === 2 ? "xl:grid-cols-2" : comparisonCodes.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4";
  const importedCount = items.filter(imported).length;
  const clearFilters = () => { setSearchTerm(""); setRegional("all"); setSortOption("numeric"); };
  const sourceUpdates = ((importStatusQuery.data?.sources ?? []) as MatrixImportSource[]);
  const sourceUpdatesByName = new Map(sourceUpdates.map(update => [update.source, update]));

  if (matrixQuery.isLoading) return <MatrixLoading />;
  if (matrixQuery.isError) return <MatrixError onRetry={() => void matrixQuery.refetch()} />;

  return <section className="mx-auto max-w-7xl animate-in fade-in duration-500">
    <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <div className="flex items-center gap-2 text-primary"><Database className="h-4 w-4" /><p className="text-xs font-bold uppercase tracking-[0.14em]">Base importada</p></div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Matriz</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Acompanhe todas as filiais aqui. Esta é uma consulta consolidada exclusiva PRO e não permite alterações pelos operadores.</p>
      </div>
      <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-4 w-4" /></span><div><p className="text-xl font-black">{importedCount} de {items.length}</p><p className="text-[11px] font-bold text-muted-foreground">filiais com dados importados</p></div></CardContent></Card>
    </header>

    <section aria-label="Atualizações das planilhas" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {(Object.keys(sourceLabels) as MatrixImportSource["source"][]).map(source => {
        const update = sourceUpdatesByName.get(source);
        return <Card key={source} className="rounded-2xl border-border/70 bg-card shadow-sm"><CardContent className="flex items-center gap-3 p-3.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Clock3 className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-xs font-black">{sourceLabels[source]}</p><p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{sourceUpdateLabel(update?.importedAt)}</p>{update && <p className="mt-0.5 text-[10px] text-muted-foreground">{update.validRows} linha{update.validRows === 1 ? "" : "s"} válida{update.validRows === 1 ? "" : "s"}</p>}</div></CardContent></Card>;
      })}
    </section>

    <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
      <div className="rounded-2xl border border-primary/25 bg-card p-3 shadow-sm">
        <label htmlFor="matrix-search" className="mb-2 flex items-center justify-between gap-3 text-sm font-black"><span className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground"><Search className="h-3.5 w-3.5" /></span>{isComparing ? "Comparar filiais" : "Pesquisar filial"}</span><span className="text-xs font-semibold text-muted-foreground">{isComparing ? `${visibleItems.length} de ${comparisonCodes.length} selecionada${comparisonCodes.length === 1 ? "" : "s"}` : `${visibleItems.length} resultado${visibleItems.length === 1 ? "" : "s"}`}</span></label>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="matrix-search" type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Nome, código ou regional · Compare: 359, 358" className="h-11 rounded-xl bg-muted/50 pl-10 pr-10" />{(searchTerm || regional !== "all") && <button type="button" aria-label="Limpar filtros da Matriz" onClick={clearFilters} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"><X className="h-4 w-4" /></button>}</div>
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">Digite até quatro códigos separados por vírgula para comparar as filiais na ordem informada.</p>
      </div>
      <div className={`min-w-52 ${isComparing ? "pointer-events-none opacity-50" : ""}`}><label htmlFor="matrix-regional" className="mb-2 flex items-center gap-2 text-sm font-black"><ListFilter className="h-4 w-4 text-primary" />Regional</label><Select value={regional} onValueChange={setRegional} disabled={isComparing}><SelectTrigger id="matrix-regional" className="h-11 rounded-xl bg-card"><SelectValue placeholder="Todas as regionais" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as regionais</SelectItem>{regionalOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
      <div className={`min-w-56 ${isComparing ? "pointer-events-none opacity-50" : ""}`}><label htmlFor="matrix-order" className="mb-2 flex items-center gap-2 text-sm font-black"><ListFilter className="h-4 w-4 text-primary" />Visualização</label><Select value={sortOption} onValueChange={value => setSortOption(value as MatrixSortOption)} disabled={isComparing}><SelectTrigger id="matrix-order" className="h-11 rounded-xl bg-card"><SelectValue placeholder="Ordem numérica" /></SelectTrigger><SelectContent><SelectItem value="numeric">Ordem numérica</SelectItem><SelectItem value="creditEffectivenessDesc">Maior efetividade Fiado</SelectItem><SelectItem value="creditEffectivenessAsc">Menor efetividade Fiado</SelectItem><SelectItem value="challengeEffectivenessDesc">Maior efetividade Desafio</SelectItem><SelectItem value="challengeEffectivenessAsc">Menor efetividade Desafio</SelectItem><SelectItem value="ticketPercentDesc">Maior % Ticket</SelectItem></SelectContent></Select></div>
      <div className={`flex h-11 items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 ${isComparing ? "opacity-50" : ""}`}><div><p className="text-xs font-extrabold">Ocultar pendentes</p><p className="text-[10px] text-muted-foreground">Sem dados importados</p></div><Switch aria-label="Ocultar filiais sem dados importados" checked={hidePending} disabled={isComparing} onCheckedChange={setHidePending} /></div>
    </div>

    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p><strong>Dados somente para consulta.</strong> A atualização é exclusiva da Administração.</p></div>

    {visibleItems.length ? <div className={`grid gap-4 ${isComparing ? comparisonGridColumns : "xl:grid-cols-2"}`}>{visibleItems.map(item => <MatrixCard key={item.branch.id} item={item} compact={isComparing} effectivenessHighlight={effectivenessHighlights.get(item.branch.id)} expanded={expanded === item.branch.id} onToggle={() => setExpanded(current => current === item.branch.id ? null : item.branch.id)} />)}</div> : <EmptyMatrix filtered={Boolean(searchTerm || regional !== "all" || hidePending)} />}
  </section>;
}

function MatrixCard({ item, compact, effectivenessHighlight, expanded, onToggle }: { item: MatrixItem; compact: boolean; effectivenessHighlight?: ComparisonEffectivenessHighlight; expanded: boolean; onToggle: () => void }) {
  const data = item.metrics;
  const fiadoRemaining = data ? matrixReceivedAmount(data.currentOverdue, data.creditGoal) : 0;
  const challengeRemaining = data ? matrixReceivedAmount(data.currentOverdue, data.challengeGoal) : 0;
  const challengeDays = data ? challengeDailyValues(data.challengeDailyReceivedJson) : [];
  const receiptDays = data ? receiptDailyValues(data.receiptDailyJson) : [];
  const highlightClass = effectivenessHighlight === "best" ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : effectivenessHighlight === "worst" ? "border-rose-500/45 ring-1 ring-rose-500/15" : "border-border/70";
  return <Card className={`overflow-hidden rounded-[1.6rem] shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md ${highlightClass}`}><CardContent className="p-5">
    <button type="button" aria-expanded={expanded} onClick={onToggle} className="flex w-full items-start justify-between gap-4 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-extrabold">{item.branch.name}</p><p className="mt-0.5 truncate text-[11px] font-semibold text-muted-foreground">{item.branch.regional || "Regional não informada"}{item.branch.code ? ` · ${item.branch.code}` : ""}</p></div></div>
      <div className="flex shrink-0 items-center gap-2"><Badge className={effectivenessHighlight === "best" ? "hidden rounded-full bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 sm:inline-flex dark:text-emerald-300" : effectivenessHighlight === "worst" ? "hidden rounded-full bg-rose-500/15 text-rose-700 hover:bg-rose-500/15 sm:inline-flex dark:text-rose-300" : "hidden"}>{effectivenessHighlight === "best" ? "Melhor efetividade" : "Menor efetividade"}</Badge><Badge className={data ? "rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300" : "rounded-full bg-muted text-muted-foreground hover:bg-muted"}>{data ? "Importada" : "Pendente"}</Badge><ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} /></div>
    </button>
    {data ? <>
      <div className={`mt-5 grid gap-3 ${compact ? "grid-cols-2" : "sm:grid-cols-3"}`}><Snapshot label="Efetividade Fiado" value={percent(data.creditEffectivenessPercent)} tone="primary" highlight={effectivenessHighlight} /><Snapshot label="Efetividade Desafio" value={percent(data.challengeEffectivenessPercent)} tone="violet" /><Snapshot label="% Ticket" value={percent(data.ticketPercent)} tone="amber" /></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><SummaryAmount label="Vendas" value={compact ? compactMoney(data.sales) : money(data.sales)} exactValue={money(data.sales)} tone="emerald" /><SummaryAmount label="Restante Fiado" value={compact ? compactMoney(fiadoRemaining) : money(fiadoRemaining)} exactValue={money(fiadoRemaining)} tone="primary" icon /></div>
      <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{updateLabel(item.updatedAt)}</div>
      {expanded && <div className="mt-5 space-y-5 border-t border-border/70 pt-5">
        <MatrixGroup title="Fiado e Desafio"><MatrixDetail label="Meta Fiado" value={money(data.creditGoal)} /><MatrixDetail label="Meta Desafio" value={money(data.challengeGoal)} tone="violet" /><MatrixDetail label="Vencido atual" value={money(data.currentOverdue)} tone="rose" /><MatrixDetail label="Restante Fiado" value={money(fiadoRemaining)} tone="primary" /><MatrixDetail label="Restante Desafio" value={money(challengeRemaining)} tone="violet" /><MatrixDetail label="Inadimplência" value={percent(data.delinquencyPercent)} tone="rose" /><MatrixDetail label="Efetividade Fiado" value={percent(data.creditEffectivenessPercent)} tone="primary" /><MatrixDetail label="Efetividade Desafio" value={percent(data.challengeEffectivenessPercent)} tone="violet" /></MatrixGroup>
        <MatrixGroup title="Meta Ticket"><MatrixDetail label="Meta Ticket" value={money(data.ticketGoal)} tone="amber" /><MatrixDetail label="% Ticket" value={percent(data.ticketPercent)} tone="amber" /><MatrixDetail label="Bonificação" value={money(data.ticketBonus)} tone="amber" /></MatrixGroup>
        <MatrixGroup title="Perdas"><MatrixDetail label="Perdas do mês" value={money(data.monthlyLoss)} tone="rose" /><MatrixDetail label="% Perdas Venda" value={percent(data.lossSalesPercent)} tone="rose" /><MatrixDetail label="Meta Rec. Perdas" value={money(data.lostGoal)} tone="amber" /><MatrixDetail label="Recuperado" value={money(data.lostReceived)} tone="amber" /><MatrixDetail label="Efetividade" value={percent(data.lossEffectivenessPercent)} tone="amber" /></MatrixGroup>
        <MatrixGroup title="Dados e previsão"><MatrixDetail label="Vendas" value={money(data.sales)} tone="emerald" /><MatrixDetail label="A receber" value={money(data.amountReceivable)} /><MatrixDetail label="Abertura vencido" value={money(data.overdueOpening)} /><MatrixDetail label="Carteira" value={money(data.portfolioTotal)} /><MatrixDetail label="Previsão de recebimento" value={money(data.receiptForecast)} tone="primary" /><MatrixDetail label="Previsão de fechamento" value={money(data.closingForecast)} tone="primary" /><MatrixDetail label="% previsão" value={percent(data.closingForecastPercent)} tone="primary" /><MatrixDetail label="Meta Rec. acumulada" value={money(data.accumulatedLossGoal)} /><MatrixDetail label="Rec. realizado" value={money(data.accumulatedLossReceived)} /><MatrixDetail label="Saldo Rec." value={money(data.accumulatedLossBalance)} /></MatrixGroup>
        <MatrixGroup title="Acompanhamento diário"><MatrixDetail label="Meta dia anterior" value={money(data.previousDayGoal)} /><MatrixDetail label="Realizado" value={money(data.dailyReceived)} tone="primary" /><MatrixDetail label="Dif. dia anterior" value={money(data.previousDayDifference)} tone="rose" /><MatrixDetail label="Diferença acumulada" value={money(data.accumulatedDifference)} tone="rose" /><MatrixDetail label="Meta dia redesenhada" value={money(data.redesignedDailyGoal)} tone="primary" /></MatrixGroup>
        <ChallengeDailyGrid values={challengeDays} />
        <ReceiptDailyGrid values={receiptDays} />
      </div>}
    </> : <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">Esta filial ainda não possui uma linha correspondente nas planilhas da última importação. Solicite ao administrador um arquivo que contenha a Filial e a Regional correspondentes.</div>}
  </CardContent></Card>;
}

function Snapshot({ label, value, exactValue, tone, highlight }: { label: string; value: string; exactValue?: string; tone: "primary" | "violet" | "amber" | "emerald"; highlight?: ComparisonEffectivenessHighlight }) { const color = tone === "violet" ? "text-violet-600" : tone === "amber" ? "text-amber-600" : tone === "emerald" ? "text-emerald-600" : "text-primary"; const highlightClass = highlight === "best" ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : highlight === "worst" ? "bg-rose-500/10 ring-1 ring-rose-500/25" : "bg-muted/50"; return <div className={`min-w-0 overflow-hidden rounded-2xl px-3 py-3 ${highlightClass}`}><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p title={exactValue ?? value} className={`mt-1 truncate text-base font-black sm:text-lg ${color}`}>{value}</p>{highlight && <p className={`mt-1 text-[9px] font-extrabold ${highlight === "best" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{highlight === "best" ? "Melhor na comparação" : "Menor na comparação"}</p>}</div>; }
function SummaryAmount({ label, value, exactValue, tone, icon = false }: { label: string; value: string; exactValue?: string; tone: "primary" | "emerald"; icon?: boolean }) { const color = tone === "emerald" ? "text-emerald-600" : "text-primary"; return <div className="min-w-0 overflow-hidden rounded-xl bg-muted/45 px-3 py-2.5"><p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.09em] text-muted-foreground">{icon && <TrendingDown className="h-3.5 w-3.5 text-primary" />}{label}</p><p title={exactValue ?? value} className={`mt-1 truncate text-xs font-black sm:text-sm ${color}`}>{value}</p></div>; }
function MatrixGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section><p className="mb-2 text-[11px] font-black uppercase tracking-[0.11em] text-muted-foreground">{title}</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div></section>; }
function ChallengeDailyGrid({ values }: { values: number[] }) { if (!values.length) return <section><p className="mb-2 text-[11px] font-black uppercase tracking-[0.11em] text-muted-foreground">Meta Desafio diária</p><div className="rounded-xl bg-muted/45 px-3 py-3 text-sm text-muted-foreground">Sem valores diários importados.</div></section>; return <section><p className="mb-2 text-[11px] font-black uppercase tracking-[0.11em] text-muted-foreground">Meta Desafio diária</p><div className="grid grid-cols-3 gap-2">{values.map((value, index) => <div key={index} className="rounded-xl bg-muted/45 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Dia {index + 1}</p><p className="mt-0.5 text-xs font-black">{money(value)}</p></div>)}</div></section>; }
function ReceiptDailyGrid({ values }: { values: Array<number | null> }) { return <section><p className="mb-2 text-[11px] font-black uppercase tracking-[0.11em] text-muted-foreground">Recebimento diário</p><div className="grid grid-cols-3 gap-2">{Array.from({ length: 31 }, (_, index) => { const value = values[index] ?? null; return <div key={index} className="rounded-xl bg-muted/45 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Dia {index + 1}</p><p className={`mt-0.5 text-xs font-black ${value === null ? "text-muted-foreground" : "text-emerald-600"}`}>{value === null ? "—" : money(value)}</p></div>; })}</div></section>; }
function MatrixDetail({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" | "violet" | "amber" | "rose" | "emerald" }) { const color = tone === "primary" ? "text-primary" : tone === "violet" ? "text-violet-600" : tone === "amber" ? "text-amber-600" : tone === "rose" ? "text-rose-600" : tone === "emerald" ? "text-emerald-600" : "text-foreground"; return <div className="rounded-xl bg-muted/45 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className={`mt-1 text-sm font-black ${color}`}>{value}</p></div>; }
function EmptyMatrix({ filtered }: { filtered: boolean }) { return <Card className="rounded-[1.6rem] border-dashed"><CardContent className="grid min-h-72 place-items-center p-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Target className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-black">{filtered ? "Nenhuma filial encontrada" : "A Matriz ainda não possui dados importados"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{filtered ? "Altere os filtros para localizar outra filial." : "A Administração deve importar um arquivo com as abas Analítico, Dados, Acomp.Meta Diaria, Meta Desafio Diária e Vencido_Dia."}</p></div></CardContent></Card>; }
function MatrixLoading() { return <div className="mx-auto max-w-7xl space-y-5"><div className="space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-44" /><Skeleton className="h-5 max-w-xl" /></div><div className="grid gap-4 xl:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-60 rounded-[1.6rem]" />)}</div></div>; }
function MatrixError({ onRetry }: { onRetry: () => void }) { return <Card className="mx-auto max-w-xl rounded-[1.6rem] border-destructive/20"><CardContent className="p-8 text-center"><CircleAlert className="mx-auto h-6 w-6 text-destructive" /><h1 className="mt-4 text-xl font-black">Não foi possível carregar a Matriz</h1><button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Tentar novamente</button></CardContent></Card>; }
