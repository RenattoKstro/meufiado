import GoalCard, { currency } from "@/components/GoalCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import React from "react";
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
import { ArrowUpRight, CalendarDays, CircleDollarSign, CircleHelp, Clock3, Medal, Percent, TicketCheck, Trophy } from "lucide-react";
import { Link } from "wouter";

type View = "overview" | "fiado" | "challenge";
type StatTone = "default" | "success" | "danger";

export default function Dashboard({ view = "overview" }: { view?: View }) {
  const { user } = useAuth();
  const profileQuery = trpc.profile.mine.useQuery();
  const metricsQuery = trpc.metrics.mine.useQuery();
  const profile = profileQuery.data?.profile;
  const branch = profileQuery.data?.branch;
  const metrics = metricsQuery.data;

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
  const fiadoTiers = FIADO_TIERS[type];
  const challengeTiers = CHALLENGE_TIERS[type];
  const ticketValid = type === "leader" && ticket.status === "achieved";
  const lostProgress = percentage(metrics.lostReceived, metrics.lostGoal);
  const delinquency = delinquencyPercentage(metrics.currentOverdue, metrics.portfolioTotal);
  const pendingSetup = metrics.creditGoal <= 0 || metrics.challengeGoal <= 0 || metrics.currentOverdue <= 0;

  const fiado = <GoalCard title="Meta Fiado" description="Premiação acumulativa por percentual atingindo." progress={fiadoProgress} received={receipts.accumulated} accumulated={accumulatedReward(fiadoTiers, fiadoProgress)} total={totalReward(fiadoTiers)} tiers={fiadoTiers} daysTotal={metrics.workingDaysTotal} daysElapsed={metrics.workingDaysElapsed} referenceGoal={metrics.creditGoal} targetMissing={target => fiadoMissingForTarget(target, metrics.creditGoal, metrics.currentOverdue)} />;
  const challenge = <GoalCard title="Meta Desafio" description="Acompanhe as faixas de bonificações do desafio." progress={challengeProgress} received={receipts.accumulated} accumulated={accumulatedReward(challengeTiers, challengeProgress)} total={totalReward(challengeTiers)} tiers={challengeTiers} daysTotal={metrics.workingDaysTotal} daysElapsed={metrics.workingDaysElapsed} referenceGoal={metrics.challengeGoal} targetMissing={target => challengeMissingForTarget(target, metrics.challengeGoal, metrics.currentOverdue)} accent="violet" />;
  const delinquencyTone: StatTone = metrics.portfolioTotal > 0 ? delinquency < 7 ? "success" : "danger" : "default";

  return <section className="mx-auto max-w-7xl animate-in fade-in duration-500">
    <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2"><Badge className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary hover:bg-primary/10">{branch.name}</Badge>{profile.isOnVacation && <Badge className="rounded-full bg-amber-500/10 px-2.5 py-1 font-bold text-amber-600 hover:bg-amber-500/10">Em férias</Badge>}</div>
        <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">Olá, {profile.fullName.split(" ")[0]}.</h1>
        <p className="mt-2 text-sm text-muted-foreground">{view === "overview" ? "Confira o desempenho e a projeção do seu recebimento" : view === "fiado" ? "Detalhamento da sua Meta Fiado." : "Detalhamento da sua Meta Desafio."}</p>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm"><CalendarDays className="h-4 w-4 text-primary" /><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Dias úteis</p><p className="text-sm font-black">{metrics.workingDaysElapsed} de {metrics.workingDaysTotal || "–"}</p></div></div>
    </header>
    {pendingSetup && <div className="mb-7 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-xs leading-relaxed text-muted-foreground">Configure os valores iniciais em <Link href="/ajustes" className="font-extrabold text-primary underline-offset-2 hover:underline">Ajustes</Link> para ativar os cálculos e projeções do painel.</p></div>}
    {view === "fiado" ? <div className="max-w-2xl">{fiado}</div> : view === "challenge" ? <div className="max-w-2xl">{challenge}</div> : <>
      <div className="grid gap-5 lg:grid-cols-2">{fiado}{challenge}</div>
      <section className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">{type === "leader" ? <TicketStatus ticket={ticket} /> : <AssistantNotice />}{profile.showLostGoal && <LostGoal progress={lostProgress} received={metrics.lostReceived} total={metrics.lostGoal} />}</section>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <QuickStat icon={Trophy} label="Premiação atual" value={currency(accumulatedReward(fiadoTiers, fiadoProgress) + accumulatedReward(challengeTiers, challengeProgress) + (ticketValid ? 100 : 0) + (profile.showLostGoal ? accumulatedReward(LOST_TIERS, lostProgress) : 0))} note="Conforme percentual atingidos" />
        <QuickStat icon={CircleDollarSign} label="Recebido acumulado" value={currency(receipts.accumulated)} note="" />
        <QuickStat icon={ArrowUpRight} label="Recebido hoje" value={currency(receipts.today)} note="" />
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

function TicketStatus({ ticket }: { ticket: ReturnType<typeof ticketGoalState> }) { const stateCopy = ticket.status === "achieved" ? "Atingida" : ticket.status === "expired" ? "Não atingida" : "Em andamento"; const stateClass = ticket.status === "achieved" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10" : ticket.status === "expired" ? "bg-destructive/10 text-destructive hover:bg-destructive/10" : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10"; return <Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm"><CardContent className="p-0"><div className="flex items-start justify-between gap-4 p-5"><div><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600"><TicketCheck className="h-4 w-4" /></span><p className="text-sm font-extrabold">Meta de 80%</p></div><p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">A meta é receber 80% do valor a receber até o dia 15. Após o prazo, sem atingimento registrado, a premiação não é válida.</p></div><Badge className={`rounded-full ${stateClass}`}>{stateCopy}</Badge></div><div className="border-t border-border/70 bg-muted/35 p-5"><div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xl font-black">{currency(100)}</p><p className="mt-1 text-[11px] text-muted-foreground">Premiação possível</p></div><div><p className="text-sm font-black">{currency(ticket.target)}</p><p className="mt-1 text-[11px] text-muted-foreground">Meta 80%</p></div><div className="text-left sm:text-right"><p className="text-sm font-black">{currency(ticket.remaining)}</p><p className="mt-1 text-[11px] text-muted-foreground">Falta para atingir</p></div></div><p className="mt-4 text-xs font-semibold text-muted-foreground">{ticket.afterDay15 ? ticket.status === "achieved" ? "Meta atingida dentro do prazo e premiação preservada." : "O prazo do dia 15 encerrou sem atingir a Meta de 80%; premiação não válida." : ticket.remaining > 0 ? `${currency(ticket.dailyNeeded)} por dia útil nos dias restantes até o dia 15.` : "Meta atingida dentro do prazo."}</p></div></CardContent></Card> }
function LostGoal({ progress, received, total }: { progress: number; received: number; total: number }) { const value = accumulatedReward(LOST_TIERS, progress); const missingAt100 = lostGoalMissingForTarget(100, total, received); const missingAt105 = lostGoalMissingForTarget(105, total, received); return <Card className="rounded-[1.6rem] border-border/70 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm font-extrabold">Meta Perdido</p><span className="text-sm font-black text-primary">{progress.toFixed(2)}%</span></div><Progress value={Math.min(progress / 105 * 100, 100)} className="mt-5 h-2.5" /><div className="mt-5 flex items-end justify-between"><div><p className="text-xl font-black">{currency(value)}</p><p className="text-[11px] text-muted-foreground">de {currency(700)} possíveis</p></div><p className="text-xs font-semibold text-muted-foreground">Recebido: <span className="text-foreground">{currency(received)}</span><br />Meta: <span className="text-foreground">{currency(total)}</span></p></div><div className="mt-5 grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-2"><MissingLostGoal label="Falta para 100%" value={missingAt100} /><MissingLostGoal label="Falta para 105%" value={missingAt105} /></div></CardContent></Card> }
function MissingLostGoal({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-muted/50 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-black">{currency(value)}</p></div> }
function AssistantNotice() { return <Card className="rounded-[1.6rem] border-border/70 bg-muted/35 shadow-sm"><CardContent className="flex gap-4 p-5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Medal className="h-4 w-4" /></div><div><p className="text-sm font-extrabold">Seu perfil é Operador Auxiliar</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">A Meta Ticket não se aplica a esta função. Suas faixas específicas estão nos cartões de Fiado e Desafio.</p></div></CardContent></Card> }
function QuickStat({ icon: Icon, label, value, note, tone = "default" }: { icon: typeof Trophy; label: string; value: string; note: string; tone?: StatTone }) { const color = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-destructive" : "text-primary"; return <Card className="rounded-2xl border-border/70 shadow-sm"><CardContent className="p-4"><div className={`flex items-center gap-2 ${color}`}><Icon className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span></div><p className={`mt-3 text-lg font-black tracking-tight ${tone === "default" ? "" : color}`}>{value}</p>{note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}</CardContent></Card> }
function DashboardLoading() { return <div className="mx-auto max-w-7xl"><div className="h-8 w-52 animate-pulse rounded-lg bg-muted" /><div className="mt-8 grid gap-5 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-[1.6rem] bg-muted" /><div className="h-80 animate-pulse rounded-[1.6rem] bg-muted" /></div></div> }
