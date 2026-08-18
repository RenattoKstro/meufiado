import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { hasBranchFinancialActivity } from "../../../shared/branchOverview";
import { challengePercentage, fiadoPercentage, receiptAmounts } from "../../../shared/goalRules";
import { Building2, ChevronDown, Clock3, TrendingUp, UserRound } from "lucide-react";
import { useState } from "react";

type BranchOverviewItem = {
  branch: { id: number; name: string; code: string | null; regional: string | null };
  operator: { id: number; fullName: string; operatorType: "leader" | "assistant"; isOnVacation: boolean; lastSignedIn: Date | null } | null;
  metrics: { portfolioTotal: number; monthOpening: number; dayOpening: number; currentOverdue: number; creditGoal: number; challengeGoal: number; lostGoal: number; lostReceived: number; workingDaysTotal: number; workingDaysElapsed: number; ticketWorkingDaysRemaining: number };
  updatedAt: Date | null;
};

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function relativeUpdate(value: Date | null) {
  if (!value) return "Sem atualização registrada";
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Atualizado agora";
  if (minutes < 60) return `Atualizado há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Atualizado há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Atualizado há ${days} ${days === 1 ? "dia" : "dias"}`;
}

export default function Branches() {
  const overviewQuery = trpc.branches.overview.useQuery();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [hideZeroed, setHideZeroed] = useState(false);

  if (overviewQuery.isLoading) return <BranchesLoading />;
  if (overviewQuery.isError) return <BranchesError />;
  const items = overviewQuery.data ?? [];
  const visibleItems = hideZeroed ? items.filter(item => hasBranchFinancialActivity(item.metrics)) : items;
  const zeroedCount = items.length - items.filter(item => hasBranchFinancialActivity(item.metrics)).length;

  return <section className="mx-auto max-w-7xl animate-in fade-in duration-500">
    <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <div className="flex items-center gap-2 text-primary"><Building2 className="h-4 w-4" /><p className="text-xs font-bold uppercase tracking-[0.14em]">Acompanhamento em rede</p></div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Filiais</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Consulte o andamento de cada operação. Selecione uma filial para ver os indicadores completos.</p>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
        <div><p className="text-sm font-extrabold">Ocultar filiais zeradas</p><p className="mt-0.5 text-[11px] text-muted-foreground">{hideZeroed ? `${visibleItems.length} filiais exibidas` : zeroedCount > 0 ? `${zeroedCount} filiais sem valores` : "Todas as filiais têm valores"}</p></div>
        <Switch aria-label="Ocultar filiais zeradas" checked={hideZeroed} onCheckedChange={setHideZeroed} />
      </div>
    </header>
    {visibleItems.length === 0 ? <EmptyBranches filtered={hideZeroed && items.length > 0} /> : <div className="grid gap-4 lg:grid-cols-2">{visibleItems.map(item => {
      const key = `${item.branch.id}-${item.operator?.id ?? "sem-operador"}`;
      const expanded = expandedKey === key;
      const fiado = fiadoPercentage(item.metrics.creditGoal, item.metrics.currentOverdue);
      const challenge = challengePercentage(item.metrics.challengeGoal, item.metrics.currentOverdue);
      const receipts = receiptAmounts(item.metrics.monthOpening, item.metrics.dayOpening, item.metrics.currentOverdue);
      return <Card key={key} role="button" tabIndex={0} aria-expanded={expanded} onClick={() => setExpandedKey(expanded ? null : key)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setExpandedKey(expanded ? null : key); } }} className="min-w-0 cursor-pointer rounded-[1.6rem] border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-extrabold">{item.branch.name}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.branch.regional || "Regional não informada"}{item.branch.code ? ` · ${item.branch.code}` : ""}</p></div></div></div><ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} /></div><div className="mt-5 flex items-center gap-2"><UserRound className="h-4 w-4 text-primary" /><p className="text-sm font-bold">{item.operator?.fullName || "Sem operador vinculado"}</p>{item.operator?.isOnVacation && <Badge className="rounded-full bg-amber-500/10 text-amber-600 hover:bg-amber-500/10">Em férias</Badge>}</div><div className="mt-5 grid gap-3 min-[440px]:grid-cols-2"><ProgressMetric label="Meta Fiado" value={fiado} /><ProgressMetric label="Meta Desafio" value={challenge} accent="violet" /></div><div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{relativeUpdate(item.updatedAt)}</div>{expanded && <BranchDetails item={item} fiado={fiado} challenge={challenge} receivedAccumulated={receipts.accumulated} />}</CardContent></Card>;
    })}</div>}
  </section>;
}

function ProgressMetric({ label, value, accent = "primary" }: { label: string; value: number; accent?: "primary" | "violet" }) { const color = accent === "violet" ? "text-violet-600" : "text-primary"; return <div className="rounded-2xl bg-muted/50 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className={`mt-1 text-lg font-black ${color}`}>{value.toFixed(2)}%</p></div>; }
function BranchDetails({ item, fiado, challenge, receivedAccumulated }: { item: BranchOverviewItem; fiado: number; challenge: number; receivedAccumulated: number }) { const details = [{ label: "Carteira total", value: currency(item.metrics.portfolioTotal) }, { label: "Abertura do mês", value: currency(item.metrics.monthOpening) }, { label: "Abertura do dia", value: currency(item.metrics.dayOpening) }, { label: "Vencido atual", value: currency(item.metrics.currentOverdue) }, { label: "Meta Fiado", value: currency(item.metrics.creditGoal) }, { label: "Meta Desafio", value: currency(item.metrics.challengeGoal) }, { label: "Recebido acumulado", value: currency(receivedAccumulated) }, { label: "Meta Perdido", value: currency(item.metrics.lostGoal) }, { label: "Recebido Perdido", value: currency(item.metrics.lostReceived) }, { label: "Dias úteis", value: `${item.metrics.workingDaysElapsed} de ${item.metrics.workingDaysTotal}` }]; return <div className="mt-5 border-t border-border/70 pt-5"><div className="flex items-center justify-between gap-4"><p className="text-sm font-extrabold">Detalhes da operação</p><div className="flex gap-2"><Badge variant="outline" className="rounded-full text-[10px]">Fiado {fiado.toFixed(2)}%</Badge><Badge variant="outline" className="rounded-full text-[10px]">Desafio {challenge.toFixed(2)}%</Badge></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{details.map(detail => <div key={detail.label} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5"><span className="text-[11px] text-muted-foreground">{detail.label}</span><span className="text-xs font-extrabold text-right">{detail.value}</span></div>)}</div><p className="mt-4 text-[11px] text-muted-foreground">{item.operator?.lastSignedIn ? `Último acesso: ${new Date(item.operator.lastSignedIn).toLocaleString("pt-BR")}.` : "Nenhum acesso do operador registrado."}</p></div>; }
function EmptyBranches({ filtered = false }: { filtered?: boolean }) { return <Card className="rounded-[1.6rem] border-border/70 shadow-sm"><CardContent className="grid min-h-64 place-items-center p-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span><p className="mt-4 text-sm font-extrabold">{filtered ? "Nenhuma filial com valores encontrada" : "Nenhuma filial ativa encontrada"}</p><p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{filtered ? "Desative a opção de ocultar filiais zeradas para consultar todas as operações." : "Cadastre ou importe filiais no painel administrativo para acompanhar os resultados nesta guia."}</p></div></CardContent></Card>; }
function BranchesError() { return <Card className="rounded-[1.6rem] border-destructive/30 shadow-sm"><CardContent className="flex min-h-52 items-center gap-4 p-6"><TrendingUp className="h-6 w-6 text-destructive" /><div><p className="font-extrabold">Não foi possível carregar as filiais</p><p className="mt-1 text-sm text-muted-foreground">Atualize a página para tentar novamente.</p></div></CardContent></Card>; }
function BranchesLoading() { return <section className="mx-auto max-w-7xl"><Skeleton className="h-9 w-40" /><Skeleton className="mt-3 h-5 w-96 max-w-full" /><div className="mt-8 grid gap-4 lg:grid-cols-2"><Skeleton className="h-60 rounded-[1.6rem]" /><Skeleton className="h-60 rounded-[1.6rem]" /></div></section>; }
