import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Building2, ChevronDown, CircleAlert, Clock3, Database, ListFilter, Search, Target, TrendingDown, X } from "lucide-react";
import { useMemo, useState } from "react";

type MatrixItem = {
  branch: { id: number; name: string; code: string | null; regional: string | null };
  metrics: {
    creditGoal: number;
    challengeGoal: number;
    currentOverdue: number;
    monthlyLoss: number;
    lossSalesPercent: number;
    lostGoal: number;
    lostReceived: number;
  } | null;
  updatedAt: Date | null;
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const percentage = (numerator: number, denominator: number) => denominator > 0 ? (numerator / denominator) * 100 : 0;
const imported = (item: MatrixItem) => item.metrics !== null;

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

export default function Matrix() {
  const matrixQuery = trpc.matrix.overview.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [regional, setRegional] = useState("all");
  const [hidePending, setHidePending] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const items = (matrixQuery.data ?? []) as MatrixItem[];
  const regionalOptions = useMemo(() => Array.from(new Set(items.map(item => item.branch.regional).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "pt-BR")), [items]);
  const visibleItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
    return items.filter(item => {
      if (hidePending && !imported(item)) return false;
      if (regional !== "all" && item.branch.regional !== regional) return false;
      if (!normalizedSearch) return true;
      return [item.branch.name, item.branch.code, item.branch.regional].filter(Boolean).some(value => value!.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
    });
  }, [hidePending, items, regional, searchTerm]);
  const importedCount = items.filter(imported).length;
  const clearFilters = () => { setSearchTerm(""); setRegional("all"); };

  if (matrixQuery.isLoading) return <MatrixLoading />;
  if (matrixQuery.isError) return <MatrixError onRetry={() => void matrixQuery.refetch()} />;

  return <section className="mx-auto max-w-7xl animate-in fade-in duration-500">
    <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <div className="flex items-center gap-2 text-primary"><Database className="h-4 w-4" /><p className="text-xs font-bold uppercase tracking-[0.14em]">Base importada</p></div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Matriz</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Acompanhe todas as filiais a partir da planilha Analítico importada pela Administração. Esta é uma consulta consolidada e não permite alterações pelos operadores.</p>
      </div>
      <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-4 w-4" /></span><div><p className="text-xl font-black">{importedCount} de {items.length}</p><p className="text-[11px] font-bold text-muted-foreground">filiais com dados importados</p></div></CardContent></Card>
    </header>

    <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
      <div className="rounded-2xl border border-primary/25 bg-card p-3 shadow-sm">
        <label htmlFor="matrix-search" className="mb-2 flex items-center justify-between gap-3 text-sm font-black"><span className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground"><Search className="h-3.5 w-3.5" /></span>Pesquisar filial</span><span className="text-xs font-semibold text-muted-foreground">{visibleItems.length} resultado{visibleItems.length === 1 ? "" : "s"}</span></label>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="matrix-search" type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Nome, código ou regional" className="h-11 rounded-xl bg-muted/50 pl-10 pr-10" />{(searchTerm || regional !== "all") && <button type="button" aria-label="Limpar filtros da Matriz" onClick={clearFilters} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"><X className="h-4 w-4" /></button>}</div>
      </div>
      <div className="min-w-52"><label htmlFor="matrix-regional" className="mb-2 flex items-center gap-2 text-sm font-black"><ListFilter className="h-4 w-4 text-primary" />Regional</label><Select value={regional} onValueChange={setRegional}><SelectTrigger id="matrix-regional" className="h-11 rounded-xl bg-card"><SelectValue placeholder="Todas as regionais" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as regionais</SelectItem>{regionalOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
      <div className="flex h-11 items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3"><div><p className="text-xs font-extrabold">Ocultar pendentes</p><p className="text-[10px] text-muted-foreground">Sem dados importados</p></div><Switch aria-label="Ocultar filiais sem dados importados" checked={hidePending} onCheckedChange={setHidePending} /></div>
    </div>

    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p><strong>Dados somente para consulta.</strong> Os valores abaixo vêm das colunas A, C, G, H, I, R, S, T e U da planilha Analítico e são atualizados exclusivamente pela importação do administrador.</p></div>

    {visibleItems.length ? <div className="grid gap-4 xl:grid-cols-2">{visibleItems.map(item => <MatrixCard key={item.branch.id} item={item} expanded={expanded === item.branch.id} onToggle={() => setExpanded(current => current === item.branch.id ? null : item.branch.id)} />)}</div> : <EmptyMatrix filtered={Boolean(searchTerm || regional !== "all" || hidePending)} />}
  </section>;
}

function MatrixCard({ item, expanded, onToggle }: { item: MatrixItem; expanded: boolean; onToggle: () => void }) {
  const data = item.metrics;
  const fiadoProgress = data ? percentage(data.creditGoal, data.currentOverdue) : 0;
  const challengeProgress = data ? percentage(data.challengeGoal, data.currentOverdue) : 0;
  const lossRecovery = data ? percentage(data.lostReceived, data.lostGoal) : 0;
  return <Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><CardContent className="p-5">
    <button type="button" aria-expanded={expanded} onClick={onToggle} className="flex w-full items-start justify-between gap-4 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-extrabold">{item.branch.name}</p><p className="mt-0.5 truncate text-[11px] font-semibold text-muted-foreground">{item.branch.regional || "Regional não informada"}{item.branch.code ? ` · ${item.branch.code}` : ""}</p></div></div>
      <div className="flex shrink-0 items-center gap-2"><Badge className={data ? "rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300" : "rounded-full bg-muted text-muted-foreground hover:bg-muted"}>{data ? "Importada" : "Pendente"}</Badge><ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} /></div>
    </button>
    {data ? <>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><Snapshot label="Meta Fiado" value={`${fiadoProgress.toFixed(2)}%`} tone="primary" /><Snapshot label="Meta Desafio" value={`${challengeProgress.toFixed(2)}%`} tone="violet" /><Snapshot label="Recup. perdas" value={`${lossRecovery.toFixed(2)}%`} tone="amber" /></div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/45 px-3 py-2.5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground"><TrendingDown className="h-4 w-4 text-primary" />Vencido atual</div><span className="text-sm font-black">{money(data.currentOverdue)}</span></div>
      <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{updateLabel(item.updatedAt)}</div>
      {expanded && <div className="mt-5 grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-2"><MatrixDetail label="Meta Fiado" value={money(data.creditGoal)} /><MatrixDetail label="Meta Desafio" value={money(data.challengeGoal)} tone="violet" /><MatrixDetail label="Vencido atual" value={money(data.currentOverdue)} tone="primary" /><MatrixDetail label="Perdas do mês" value={money(data.monthlyLoss)} tone="rose" /><MatrixDetail label="% perdas venda" value={`${data.lossSalesPercent.toFixed(2)}%`} tone="rose" /><MatrixDetail label="Meta Rec. Perdas" value={money(data.lostGoal)} tone="amber" /><MatrixDetail label="Recuperação Perdas" value={money(data.lostReceived)} tone="amber" /><MatrixDetail label="Falta recuperar perdas" value={money(Math.max(data.lostGoal - data.lostReceived, 0))} /></div>}
    </> : <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">Esta filial ainda não possui uma linha correspondente na última importação do Analítico. Solicite ao administrador o envio de uma planilha que contenha este código de filial.</div>}
  </CardContent></Card>;
}

function Snapshot({ label, value, tone }: { label: string; value: string; tone: "primary" | "violet" | "amber" }) { const color = tone === "violet" ? "text-violet-600" : tone === "amber" ? "text-amber-600" : "text-primary"; return <div className="rounded-2xl bg-muted/50 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className={`mt-1 text-lg font-black ${color}`}>{value}</p></div>; }
function MatrixDetail({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" | "violet" | "amber" | "rose" }) { const color = tone === "primary" ? "text-primary" : tone === "violet" ? "text-violet-600" : tone === "amber" ? "text-amber-600" : tone === "rose" ? "text-rose-600" : "text-foreground"; return <div className="rounded-xl bg-muted/45 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className={`mt-1 text-sm font-black ${color}`}>{value}</p></div>; }
function EmptyMatrix({ filtered }: { filtered: boolean }) { return <Card className="rounded-[1.6rem] border-dashed"><CardContent className="grid min-h-72 place-items-center p-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Target className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-black">{filtered ? "Nenhuma filial encontrada" : "A Matriz ainda não possui dados importados"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{filtered ? "Altere os filtros para localizar outra filial." : "A Administração deve importar a planilha Analítico para preencher esta consulta."}</p></div></CardContent></Card>; }
function MatrixLoading() { return <div className="mx-auto max-w-7xl space-y-5"><div className="space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-44" /><Skeleton className="h-5 max-w-xl" /></div><div className="grid gap-4 xl:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-60 rounded-[1.6rem]" />)}</div></div>; }
function MatrixError({ onRetry }: { onRetry: () => void }) { return <Card className="mx-auto max-w-xl rounded-[1.6rem] border-destructive/20"><CardContent className="p-8 text-center"><CircleAlert className="mx-auto h-6 w-6 text-destructive" /><h1 className="mt-4 text-xl font-black">Não foi possível carregar a Matriz</h1><button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Tentar novamente</button></CardContent></Card>; }
