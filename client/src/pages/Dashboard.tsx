import GoalCard, { currency } from "@/components/GoalCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useAppTexts } from "@/contexts/AppTextContext";
import { useAuth } from "@/_core/hooks/useAuth";
import React from "react";
import { receiptProjection, type ReceiptProjection } from "../../../shared/receiptProjection";
import { collectionProjectionRisk, fiadoGoalGap, type FiadoGoalGap, type ProjectionRisk } from "../../../shared/collectionInsights";
import {
  accumulatedReward,
  amountReceivable,
  challengeMissingForTarget,
  challengePercentage,
  CHALLENGE_TIERS,
  delinquencyPercentage,
  fiadoMissingForTarget,
  fiadoPercentage,
  FIADO_TIERS,
  LOST_TIERS,
  lostGoalMissingForTarget,
  percentage,
  receiptAmounts,
  ticketGoalState,
  totalReward,
} from "../../../shared/goalRules";
import { AlertTriangle, ArrowUpRight, CalendarDays, CircleDollarSign, CircleHelp, Clock3, LockKeyhole, Medal, Percent, TicketCheck, TrendingUp, Trophy } from "lucide-react";
import { Link } from "wouter";

type View = "overview" | "fiado" | "challenge";
type StatTone = "default" | "success" | "danger";

function currentBrazilMonth() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}`;
}

function currentBrazilDate() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default function Dashboard({ view = "overview" }: { view?: View }) {
  const { user } = useAuth();
  const texts = useAppTexts();
  const [projectionMonth] = React.useState(currentBrazilMonth);
  const [today] = React.useState(currentBrazilDate);
  const profileQuery = trpc.profile.mine.useQuery();
  const metricsQuery = trpc.metrics.mine.useQuery();
  const subscriptionQuery = trpc.subscription?.mine.useQuery(undefined, { enabled: Boolean(user), refetchInterval: 15_000, refetchOnWindowFocus: true });
  const profile = profileQuery.data?.profile;
  const branch = profileQuery.data?.branch;
  const metrics = metricsQuery.data;
  const canViewProjection = user?.role === "admin" || Boolean(subscriptionQuery?.data?.isPro);
  const historyQuery = trpc.history?.list.useQuery({ month: projectionMonth }, { enabled: canViewProjection && Boolean(profile?.branchId) });
  const dailyStatusQuery = trpc.history?.dailyStatus.useQuery({ entryDate: today }, { enabled: Boolean(profile?.branchId) });

  if (profileQuery.isLoading || metricsQuery.isLoading) return <DashboardLoading />;
  if (user?.role === "admin" && (!profile || !branch)) return <AdminDashboardNotice view={view} />;
  if (!profile || !branch || !metrics) return <DashboardLoading />;

  const type = profile.operatorType;
  const receipts = receiptAmounts(metrics.monthOpening, metrics.dayOpening, metrics.currentOverdue);
  const fiadoProgress = fiadoPercentage(metrics.creditGoal, metrics.currentOverdue);
  const receivableAmount = amountReceivable(metrics.monthOpening, metrics.creditGoal);
  const ticket = ticketGoalState({
    receivedAccumulated: receipts.accumulated,
    receivableAmount,
    workingDaysRemaining: metrics.ticketWorkingDaysRemaining,
    reachedByDay15: metrics.fiadoAtDay15,
  });
  const challengeProgress = challengePercentage(metrics.challengeGoal, metrics.currentOverdue);
  const fiadoRemaining = metrics.creditGoal - metrics.currentOverdue;
  const challengeRemaining = metrics.challengeGoal - metrics.currentOverdue;
  const workingDaysRemaining = Math.max(metrics.workingDaysTotal - metrics.workingDaysElapsed, 0);
  const dailyGoal = workingDaysRemaining > 0 ? Math.max(fiadoRemaining, 0) / workingDaysRemaining : 0;
  const projection = receiptProjection({
    historyTotalReceived: historyQuery?.data?.totalReceived ?? 0,
    historyDaysRecorded: historyQuery?.data?.daysRecorded ?? 0,
    fallbackTotalReceived: receipts.accumulated,
    workingDaysElapsed: metrics.workingDaysElapsed,
    workingDaysRemaining,
    remainingToReceive: Math.max(metrics.currentOverdue - metrics.creditGoal, 0),
  });
  const projectionRisk = collectionProjectionRisk({ monthOpening: metrics.monthOpening, projectedReceived: projection.projectedReceived, creditGoal: metrics.creditGoal });
  const goalGap = fiadoGoalGap({ projectedOverdue: projectionRisk.projectedOverdue, creditGoal: metrics.creditGoal });
  const fiadoTiers = FIADO_TIERS[type];
  const challengeTiers = CHALLENGE_TIERS[type];
  const ticketValid = type === "leader" && ticket.status === "achieved";
  const lostProgress = percentage(metrics.lostReceived, metrics.lostGoal);
  const delinquency = delinquencyPercentage(metrics.currentOverdue, metrics.portfolioTotal);
  const pendingSetup = metrics.creditGoal <= 0 || metrics.challengeGoal <= 0 || metrics.currentOverdue <= 0;

  const fiado = <GoalCard title="Meta Fiado" description="Premiação acumulativa por percentual atingindo." progress={fiadoProgress} received={receipts.accumulated} accumulated={accumulatedReward(fiadoTiers, fiadoProgress)} total={totalReward(fiadoTiers)} tiers={fiadoTiers} daysTotal={metrics.workingDaysTotal} daysElapsed={metrics.workingDaysElapsed} referenceGoal={metrics.creditGoal} remainingLabel="Restante Fiado" remainingValue={fiadoRemaining} targetMissing={target => fiadoMissingForTarget(target, metrics.creditGoal, metrics.currentOverdue)} />;
  const challenge = <GoalCard title="Meta Desafio" description="Acompanhe as faixas de bonificações do desafio." progress={challengeProgress} received={receipts.accumulated} accumulated={accumulatedReward(challengeTiers, challengeProgress)} total={totalReward(challengeTiers)} tiers={challengeTiers} daysTotal={metrics.workingDaysTotal} daysElapsed={metrics.workingDaysElapsed} referenceGoal={metrics.challengeGoal} remainingLabel="Restante Desafio" remainingValue={challengeRemaining} targetMissing={target => challengeMissingForTarget(target, metrics.challengeGoal, metrics.currentOverdue)} accent="violet" />;
  const delinquencyTone: StatTone = metrics.portfolioTotal > 0 ? delinquency < 7 ? "success" : "danger" : "default";

  return <section className="mx-auto max-w-7xl animate-in fade-in duration-500">
    <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2"><Badge className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary hover:bg-primary/10">{branch.name}</Badge>{profile.isOnVacation && <Badge className="rounded-full bg-amber-500/10 px-2.5 py-1 font-bold text-amber-600 hover:bg-amber-500/10">Em férias</Badge>}</div>
        <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{view === "overview" ? texts.overviewTitle : view === "fiado" ? "Meta Fiado" : "Meta Desafio"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{view === "overview" ? texts.overviewDescription : view === "fiado" ? "Detalhamento da sua Meta Fiado." : "Detalhamento da sua Meta Desafio."}</p>
        {view === "overview" && <p className="mt-2 text-xs font-semibold text-muted-foreground">Olá, {profile.fullName.split(" ")[0]}.</p>}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm"><CalendarDays className="h-4 w-4 text-primary" /><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Dias úteis</p><p className="text-sm font-black">{metrics.workingDaysElapsed} de {metrics.workingDaysTotal || "–"}</p></div></div>
    </header>
    {pendingSetup && <div className="mb-7 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-xs leading-relaxed text-muted-foreground">Configure os valores iniciais em <Link href="/ajustes" className="font-extrabold text-primary underline-offset-2 hover:underline">Ajustes</Link> para ativar os cálculos e projeções do painel.</p></div>}
    {view === "overview" && dailyStatusQuery?.data?.hasBranch && !dailyStatusQuery.data.hasEntry && <div className="mb-7 flex items-start justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"><div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><p className="text-xs leading-relaxed text-amber-950 dark:text-amber-100"><strong>Lembrete diário:</strong> ainda não há recebimento salvo para hoje. Registre o valor ao encerrar a rotina da filial.</p></div><Link href="/historicos" className="shrink-0 text-xs font-extrabold text-amber-800 underline-offset-2 hover:underline dark:text-amber-200">Lançar agora</Link></div>}
    {view === "fiado" ? <div className="max-w-2xl">{fiado}</div> : view === "challenge" ? <div className="max-w-2xl">{challenge}</div> : <>
      <div className="grid gap-5 lg:grid-cols-2">{fiado}{challenge}</div>
      <ReceiptProjectionCard projection={projection} canView={canViewProjection} isLoading={Boolean(historyQuery?.isLoading) && canViewProjection} />
      <FiadoGoalGapCard gap={goalGap} canView={canViewProjection} />
      {canViewProjection && projectionRisk.status !== "unavailable" && <ProjectionRiskCard risk={projectionRisk} />}
      <section className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">{type === "leader" ? <TicketStatus ticket={ticket} /> : <AssistantNotice />}{profile.showLostGoal && <LostGoal progress={lostProgress} received={metrics.lostReceived} total={metrics.lostGoal} />}</section>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <QuickStat icon={Trophy} label="Premiação atual" value={currency(accumulatedReward(fiadoTiers, fiadoProgress) + accumulatedReward(challengeTiers, challengeProgress) + (ticketValid ? 100 : 0) + (profile.showLostGoal ? accumulatedReward(LOST_TIERS, lostProgress) : 0))} note="Conforme percentual atingidos" />
        <QuickStat icon={CircleDollarSign} label="Recebido acumulado" value={currency(receipts.accumulated)} note="" />
        <QuickStat icon={ArrowUpRight} label="Meta Diária / Rec. Hoje" value={`${currency(dailyGoal)} / ${currency(receipts.today)}`} note="" />
        <QuickStat icon={CircleDollarSign} label="Restante Fiado" value={currency(fiadoRemaining)} note="" />
        <QuickStat icon={CircleDollarSign} label="Restante Desafio" value={currency(challengeRemaining)} note="" />
        <QuickStat icon={CircleDollarSign} label="Vencido atual" value={currency(metrics.currentOverdue)} note="" />
        <QuickStat icon={CircleDollarSign} label="À receber" value={currency(receivableAmount)} note="" />
        <QuickStat icon={ArrowUpRight} label="Meta 80%" value={currency(ticket.target)} note="" />
        <QuickStat icon={ArrowUpRight} label="Falta para 80%" value={currency(ticket.remaining)} note={ticket.afterDay15 ? "Prazo encerrado" : "Saldo até o dia 15"} />
        <QuickStat icon={Clock3} label="Por dia até o dia 15" value={currency(ticket.dailyNeeded)} note={`${metrics.ticketWorkingDaysRemaining} dias úteis restantes`} />
        <QuickStat icon={Percent} label="Inadimplência" value={metrics.portfolioTotal > 0 ? `${delinquency.toFixed(2)}%` : "—"} note={metrics.portfolioTotal > 0 ? "" : "Informe a carteira total"} tone={delinquencyTone} />
      </section>
    </>}
  </section>;
}

function AdminDashboardNotice({ view }: { view: View }) {
  const title = view === "overview" ? "Visão geral" : view === "fiado" ? "Meta Fiado" : "Meta Desafio";
  return <section className="mx-auto max-w-4xl animate-in fade-in duration-300"><Card className="overflow-hidden rounded-[1.8rem] border-primary/20 shadow-sm"><CardContent className="p-7 sm:p-9"><Badge className="rounded-full bg-primary/10 px-3 py-1 font-bold text-primary hover:bg-primary/10">Modo administrador</Badge><h1 className="mt-5 text-3xl font-black tracking-[-0.04em]">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Esta página está disponível para consulta administrativa. Como esta conta não está vinculada a uma filial, os indicadores individuais não são exibidos aqui.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/filiais" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground shadow-sm transition-transform hover:brightness-105 active:scale-[0.98]">Ver resultados por filial</Link><Link href="/admin" className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-extrabold transition-colors hover:bg-muted">Abrir administração</Link></div></CardContent></Card></section>;
}

export function ReceiptProjectionCard({ projection, canView, isLoading }: { projection: ReceiptProjection; canView: boolean; isLoading: boolean }) {
  if (!canView) return <Card className="mt-7 overflow-hidden rounded-[1.7rem] border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm"><CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><LockKeyhole className="h-5 w-5" /></span><div><p className="text-base font-black">Projeção e GAP da Meta Fiado</p><p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">Somente usuários PRO podem ver a projeção e o GAP da Meta Fiado.</p></div></div><Link href="/plano" className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-extrabold text-primary-foreground shadow-sm transition-transform hover:brightness-105 active:scale-[0.98]">Conhecer o plano PRO</Link></CardContent></Card>;
  if (isLoading) return <Card className="mt-7 rounded-[1.7rem] border-border/70 shadow-sm"><CardContent className="p-6"><div className="h-5 w-52 animate-pulse rounded bg-muted" /><div className="mt-5 h-16 animate-pulse rounded-2xl bg-muted" /></CardContent></Card>;
  const sourceDescription = projection.source === "daily-history" ? "Baseada nos recebimentos diários, limitada pela Meta Fiado." : "Baseada no total recebido e limitada pela Meta Fiado.";
  const rate = Math.min(projection.projectedCollectionRate, 100);
  return <Card className="mt-7 overflow-hidden rounded-[1.7rem] border-primary/20 shadow-sm"><CardContent className="p-0"><div className="flex flex-col justify-between gap-4 border-b border-border/70 bg-primary/5 p-6 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary"><TrendingUp className="h-4 w-4" /></span><div><p className="text-base font-black">Forecast de recebimento</p><p className="mt-1 text-xs text-muted-foreground">{sourceDescription}</p></div></div></div><Badge className="w-fit rounded-full bg-primary/10 px-3 py-1 font-bold text-primary hover:bg-primary/10">{projection.source === "daily-history" ? "Com histórico diário" : "Por total recebido"}</Badge></div><div className="grid gap-5 p-6 lg:grid-cols-[1.1fr_.9fr]"><div><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Estimativa de recebido na Meta Fiado</p><p className="mt-2 text-3xl font-black tracking-[-0.04em] text-primary">{currency(projection.projectedReceived)}</p><div className="mt-5"><div className="flex items-center justify-between gap-3 text-xs font-bold"><span>Previsão de atingimento da meta</span><span className="text-primary">{projection.projectedCollectionRate.toFixed(2)}%</span></div><Progress value={rate} className="mt-2 h-2.5" /></div></div><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1"><ProjectionMetric label="Meta de recebimento" value={currency(projection.targetReceived)} /><ProjectionMetric label="Falta para a meta" value={currency(projection.remainingToReceive)} /><ProjectionMetric label="Necessário por dia" value={currency(projection.dailyNeeded)} /></div></div><div className="border-t border-border/70 bg-muted/35 px-6 py-4"><p className="text-xs leading-relaxed text-muted-foreground">{projection.daysRemaining > 0 ? <>O forecast usa a média de <strong className="text-foreground">{currency(projection.averagePerDay)}</strong>, reduz o peso dos últimos dias úteis e respeita o teto de <strong className="text-foreground">101% da Meta Fiado</strong>. Para atingir a meta, são necessários <strong className="text-foreground">{currency(projection.dailyNeeded)}</strong> por dia.</> : <>Não há dias úteis restantes no período. O forecast mostra o total estimado dentro da Meta Fiado.</>}</p></div></CardContent></Card>;
}

export function FiadoGoalGapCard({ gap, canView }: { gap: FiadoGoalGap; canView: boolean }) {
  if (!canView || gap.status === "unavailable") return null;
  const withinTarget = gap.status === "inside";
  const styles = withinTarget
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
    : "border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-100";
  const amountLabel = withinTarget ? "Margem dentro da meta" : "GAP a recuperar";
  return <Card className={`mt-5 rounded-[1.5rem] border ${styles}`}><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><TrendingUp className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">GAP da Meta Fiado</p><p className="mt-1 text-sm leading-relaxed opacity-85">{gap.message}</p><p className="mt-2 text-xs opacity-75">Vencido projetado: <strong>{currency(gap.projectedOverdue)}</strong> · Meta Fiado: <strong>{currency(gap.creditGoal)}</strong></p></div></div><div className="rounded-xl border border-current/15 bg-background/35 px-4 py-3 text-left sm:text-right"><Badge className={`rounded-full ${withinTarget ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200" : "bg-rose-500/15 text-rose-700 hover:bg-rose-500/15 dark:text-rose-200"}`}>{withinTarget ? "Dentro da meta" : "Fora da meta"}</Badge><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">{amountLabel}</p><p className="mt-1 text-lg font-black">{currency(gap.amount)}</p></div></CardContent></Card>;
}

function ProjectionRiskCard({ risk }: { risk: ProjectionRisk }) {
  const styles = risk.status === "healthy"
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
    : risk.status === "critical"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-100"
      : "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100";
  const iconClass = risk.status === "healthy" ? "text-emerald-700 dark:text-emerald-300" : risk.status === "critical" ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300";
  const title = risk.status === "healthy" ? "Projeção favorável" : risk.status === "critical" ? "Alerta de risco" : "Atenção à Meta Fiado";
  return <Card className={`mt-5 rounded-[1.5rem] border ${styles}`}><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} /><div><p className="font-black">{title}</p><p className="mt-1 text-sm leading-relaxed opacity-85">{risk.message}</p></div></div>{risk.amountToRecover > 0 && <div className="rounded-xl border border-current/15 bg-background/35 px-4 py-3 text-left sm:text-right"><p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">Reforço estimado</p><p className="mt-1 text-sm font-black">{currency(risk.amountToRecover)}</p></div>}</CardContent></Card>;
}

function ProjectionMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-border/70 bg-card px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>; }

function TicketStatus({ ticket }: { ticket: ReturnType<typeof ticketGoalState> }) { const stateCopy = ticket.status === "achieved" ? "Atingida" : ticket.status === "expired" ? "Não atingida" : "Em andamento"; const stateClass = ticket.status === "achieved" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10" : ticket.status === "expired" ? "bg-destructive/10 text-destructive hover:bg-destructive/10" : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10"; return <Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm"><CardContent className="p-0"><div className="flex items-start justify-between gap-4 p-5"><div><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600"><TicketCheck className="h-4 w-4" /></span><p className="text-sm font-extrabold">Meta de 80%</p></div><p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">A meta é receber 80% do valor a receber até o dia 15. Após o prazo, sem atingimento registrado, a premiação não é válida.</p></div><Badge className={`rounded-full ${stateClass}`}>{stateCopy}</Badge></div><div className="border-t border-border/70 bg-muted/35 p-5"><div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xl font-black">{currency(100)}</p><p className="mt-1 text-[11px] text-muted-foreground">Premiação possível</p></div><div><p className="text-sm font-black">{currency(ticket.target)}</p><p className="mt-1 text-[11px] text-muted-foreground">Meta 80%</p></div><div className="text-left sm:text-right"><p className="text-sm font-black">{currency(ticket.remaining)}</p><p className="mt-1 text-[11px] text-muted-foreground">Falta para atingir</p></div></div><p className="mt-4 text-xs font-semibold text-muted-foreground">{ticket.afterDay15 ? ticket.status === "achieved" ? "Meta atingida dentro do prazo e premiação preservada." : "O prazo do dia 15 encerrou sem atingir a Meta de 80%; premiação não válida." : ticket.remaining > 0 ? `${currency(ticket.dailyNeeded)} por dia útil nos dias restantes até o dia 15.` : "Meta atingida dentro do prazo."}</p></div></CardContent></Card> }
function LostGoal({ progress, received, total }: { progress: number; received: number; total: number }) { const value = accumulatedReward(LOST_TIERS, progress); const missingAt100 = lostGoalMissingForTarget(100, total, received); const missingAt105 = lostGoalMissingForTarget(105, total, received); return <Card className="rounded-[1.6rem] border-border/70 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm font-extrabold">Meta Perdido</p><span className="text-sm font-black text-primary">{progress.toFixed(2)}%</span></div><Progress value={Math.min(progress / 105 * 100, 100)} className="mt-5 h-2.5" /><div className="mt-5 flex items-end justify-between"><div><p className="text-xl font-black">{currency(value)}</p><p className="text-[11px] text-muted-foreground">de {currency(700)} possíveis</p></div><p className="text-xs font-semibold text-muted-foreground">Recebido: <span className="text-foreground">{currency(received)}</span><br />Meta: <span className="text-foreground">{currency(total)}</span></p></div><div className="mt-5 grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-2"><MissingLostGoal label="Falta para 100%" value={missingAt100} /><MissingLostGoal label="Falta para 105%" value={missingAt105} /></div></CardContent></Card> }
function MissingLostGoal({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-muted/50 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-black">{currency(value)}</p></div> }
function AssistantNotice() { return <Card className="rounded-[1.6rem] border-border/70 bg-muted/35 shadow-sm"><CardContent className="flex gap-4 p-5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Medal className="h-4 w-4" /></div><div><p className="text-sm font-extrabold">Seu perfil é Operador Auxiliar</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">A Meta Ticket não se aplica a esta função. Suas faixas específicas estão nos cartões de Fiado e Desafio.</p></div></CardContent></Card> }
function QuickStat({ icon: Icon, label, value, note, tone = "default" }: { icon: typeof Trophy; label: string; value: string; note: string; tone?: StatTone }) { const color = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-destructive" : "text-primary"; return <Card className="rounded-2xl border-border/70 shadow-sm"><CardContent className="p-4"><div className={`flex items-center gap-2 ${color}`}><Icon className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span></div><p className={`mt-3 text-lg font-black tracking-tight ${tone === "default" ? "" : color}`}>{value}</p>{note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}</CardContent></Card> }
function DashboardLoading() { return <div className="mx-auto max-w-7xl"><div className="h-8 w-52 animate-pulse rounded-lg bg-muted" /><div className="mt-8 grid gap-5 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-[1.6rem] bg-muted" /><div className="h-80 animate-pulse rounded-[1.6rem] bg-muted" /></div></div> }
