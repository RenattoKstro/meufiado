import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChevronDown, CircleCheck, LockKeyhole, Sparkles } from "lucide-react";
import React, { useState } from "react";
import type { RewardTier } from "../../../shared/goalRules";

export function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

type GoalCardProps = {
  title: string;
  description: string;
  progress: number;
  received: number;
  accumulated: number;
  total: number;
  tiers: RewardTier[];
  daysTotal: number;
  daysElapsed: number;
  referenceGoal: number;
  remainingLabel?: string;
  remainingValue?: number;
  dailyGoal?: number;
  dailyReceived?: number;
  targetMissing?: (target: number) => number;
  projectionTargets?: number[];
  accent?: "primary" | "violet" | "emerald";
  overviewStyle?: boolean;
};

const tierPalette = [
  { bar: "bg-cyan-500", text: "text-cyan-700", soft: "bg-cyan-500/10" },
  { bar: "bg-sky-500", text: "text-sky-700", soft: "bg-sky-500/10" },
  { bar: "bg-blue-500", text: "text-blue-700", soft: "bg-blue-500/10" },
  { bar: "bg-indigo-500", text: "text-indigo-700", soft: "bg-indigo-500/10" },
  { bar: "bg-violet-500", text: "text-violet-700", soft: "bg-violet-500/10" },
  { bar: "bg-fuchsia-500", text: "text-fuchsia-700", soft: "bg-fuchsia-500/10" },
  { bar: "bg-pink-500", text: "text-pink-700", soft: "bg-pink-500/10" },
  { bar: "bg-amber-500", text: "text-amber-700", soft: "bg-amber-500/10" },
];

export default function GoalCard({ title, description, progress, received, accumulated, total, tiers, daysTotal, daysElapsed, referenceGoal, remainingLabel, remainingValue, dailyGoal, dailyReceived, targetMissing, projectionTargets, accent = "primary", overviewStyle = false }: GoalCardProps) {
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const visualProgress = Math.min(progress, 105);
  const displayedTargets = Array.from(new Set(projectionTargets ?? tiers.map(tier => tier.target)));
  const missing = (target: number) => targetMissing ? targetMissing(target) : Math.max(0, (referenceGoal * target) / 100 - received);
  const daily = (target: number) => {
    const days = Math.max(daysTotal - daysElapsed, 0);
    return days > 0 ? missing(target) / days : 0;
  };
  const daysRemaining = Math.max(daysTotal - daysElapsed, 0);
  const dailyNeeded = daysRemaining > 0 && typeof remainingValue === "number" ? remainingValue / daysRemaining : 0;
  const displayedDailyGoal = dailyGoal ?? dailyNeeded;
  const displayedDailyReceived = dailyReceived ?? 0;
  const dailyGoalReached = displayedDailyGoal <= 0 || displayedDailyReceived >= displayedDailyGoal;
  const ringPercentage = Math.min(Math.max(progress, 0), 105) / 105 * 100;
  const accentVariables = accent === "violet" ? "[--primary:oklch(0.52_0.22_292)]" : accent === "emerald" ? "[--primary:oklch(0.72_0.16_160)]" : "";

  const expandedContent = open && <div className="border-t border-border/70 bg-muted/35 p-5">
    <div className="mb-4 grid grid-cols-2 gap-3">
      {displayedTargets.map(target => <div key={target} className="rounded-2xl bg-background p-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Falta para {target}%</p><p className="mt-2 text-sm font-black">{currency(missing(target))}</p><p className="mt-1 text-[11px] leading-snug text-muted-foreground">Saldo a receber · {currency(daily(target))}/dia</p></div>)}
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Faixas de premiação</p><p className="text-[10px] font-semibold text-muted-foreground">Progresso por faixa</p></div>
      {tiers.map((tier, index) => {
        const hit = progress >= tier.target;
        const palette = tierPalette[index % tierPalette.length];
        const tierProgress = Math.min(Math.max((progress / tier.target) * 100, 0), 100);
        return <div key={tier.target} className={cn("rounded-2xl border border-border/60 p-3 transition-colors", hit ? palette.soft : "bg-background/70")}>
          <div className="flex items-center justify-between gap-3 text-xs"><div className="flex items-center gap-2">{hit ? <CircleCheck className={cn("h-4 w-4", palette.text)} /> : <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" />}<span className={hit ? "font-extrabold text-foreground" : "font-semibold text-muted-foreground"}>{tier.target}%</span><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold", hit ? `${palette.soft} ${palette.text}` : "bg-muted text-muted-foreground")}>{hit ? "Atingida" : "Em andamento"}</span></div><span className={hit ? cn("font-extrabold", palette.text) : "font-semibold text-muted-foreground"}>{currency(tier.reward)}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Progresso da faixa ${tier.target}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(tierProgress.toFixed(2))} aria-valuetext={`${tierProgress.toFixed(2)}% rumo à faixa de ${tier.target}%`}><div className={cn("h-full rounded-full transition-[width] duration-500", palette.bar)} style={{ width: `${tierProgress}%` }} /></div>
        </div>;
      })}
    </div>
  </div>;

  if (overviewStyle) {
    return <article className={cn("overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_14px_38px_-24px_color-mix(in_oklab,var(--primary)_45%,transparent)] transition-shadow hover:shadow-[0_18px_42px_-24px_color-mix(in_oklab,var(--primary)_65%,transparent)]", accentVariables)}>
      <div className="p-5 text-left sm:p-7">
        <div className="flex items-center justify-center gap-2 text-sm font-extrabold"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="h-3.5 w-3.5" /></span>{title}</div>
        <div className="relative mx-auto mt-5 w-fit" onMouseEnter={() => setDetailsOpen(true)} onMouseLeave={() => setDetailsOpen(false)}>
            <button type="button" aria-label={`Detalhes das faixas da ${title}`} aria-expanded={detailsOpen} onFocus={() => setDetailsOpen(true)} onBlur={() => setDetailsOpen(false)} onClick={() => setDetailsOpen(current => !current)} className="grid h-36 w-36 place-items-center rounded-full border border-primary/20 p-2 shadow-[0_0_0_6px_color-mix(in_oklab,var(--primary)_7%,transparent)] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ background: `conic-gradient(var(--primary) ${ringPercentage}%, hsl(var(--muted)) ${ringPercentage}% 100%)` }}>
              <span className="grid h-full w-full place-items-center rounded-full bg-card text-center"><span className="text-2xl font-black tracking-[-0.05em]">{progress.toFixed(2)}%</span><span className="sr-only">Passe o cursor para ver os valores faltantes por faixa.</span></span>
            </button>
            {detailsOpen && <div role="tooltip" className="absolute left-1/2 z-30 mt-3 w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-border/70 bg-popover p-4 text-popover-foreground shadow-xl">
              <p className="font-extrabold">Faltas por faixa</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Valor restante para cada percentual da {title}.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {displayedTargets.map(target => <div key={target} className="rounded-lg border border-border/70 bg-muted/50 px-2.5 py-2"><p className="text-[10px] font-bold text-muted-foreground">{target}%</p><p className="mt-0.5 text-xs font-black">{currency(missing(target))}</p></div>)}
              </div>
            </div>}
        </div>
        <div className="mt-5 text-center"><p className="text-lg font-black tracking-tight">{currency(referenceGoal)}</p><p className="text-[11px] font-semibold text-muted-foreground">{title}</p></div>
        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border/70 pt-4 text-xs"><GoalSummary label="Recebido" value={currency(received)} /><GoalSummary label={remainingLabel ?? "Restante"} value={currency(remainingValue ?? 0)} /><GoalSummary label="Premiação atual" value={currency(accumulated)} /><GoalSummary label="Meta diária / Rec. hoje" value={`${currency(displayedDailyGoal)} / ${currency(displayedDailyReceived)}`} tone={dailyGoalReached ? "success" : "danger"} /></div>
        <button type="button" onClick={() => setOpen(current => !current)} aria-expanded={open} className="mt-5 flex w-full items-center justify-between border-t border-border/60 pt-4 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>{open ? "Ocultar faixas" : "Ver faixas e projeções"}</span><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></button>
      </div>
      {expandedContent}
    </article>;
  }

  return (
    <article className={cn("overflow-hidden rounded-[1.6rem] border border-border/70 bg-card shadow-[0_14px_38px_-24px_color-mix(in_oklab,var(--primary)_45%,transparent)] transition-shadow hover:shadow-[0_18px_42px_-24px_color-mix(in_oklab,var(--primary)_65%,transparent)]", accentVariables)}>
      <button onClick={() => setOpen(current => !current)} className="block w-full p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2"><span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></span><p className="text-sm font-extrabold tracking-tight">{title}</p></div>
            <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <Badge variant="secondary" className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary">{progress.toFixed(2)}%</Badge>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex items-end justify-between gap-4"><div><p className="text-2xl font-black tracking-tight">{currency(accumulated)}</p><p className="text-[11px] font-medium text-muted-foreground">de {currency(total)} possíveis</p></div><div className="space-y-2 text-right text-[11px] font-semibold text-muted-foreground"><p>Recebido acumulado<br /><span className="text-foreground">{currency(received)}</span></p>{remainingLabel && typeof remainingValue === "number" && <p>{remainingLabel}<br /><span className="text-foreground">{currency(remainingValue)}</span></p>}</div></div>
          <Progress value={Math.min((progress / 105) * 100, 100)} className="h-2.5 bg-muted [&>div]:bg-primary" />
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-xs font-bold text-muted-foreground"><span>{open ? "Ocultar projeções" : "Ver faixas e projeções"}</span><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></div>
      </button>
      {expandedContent}
    </article>
  );
}

function GoalSummary({ label, value, tone }: { label: string; value: string; tone?: "accent" | "success" | "danger" }) {
  return <div><p className="text-muted-foreground">{label}</p><p className={cn("mt-1 font-extrabold", tone === "accent" && "text-primary", tone === "success" && "text-emerald-600 dark:text-emerald-400", tone === "danger" && "text-rose-600 dark:text-rose-400")}>{value}</p></div>;
}
