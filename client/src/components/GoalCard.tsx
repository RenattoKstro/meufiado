import { cn } from "@/lib/utils";
import { Check, CircleCheck, Sparkles } from "lucide-react";
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
  dailyGoal: number;
  dailyReceived: number;
  remainingLabel?: string;
  remainingValue?: number;
  targetMissing?: (target: number) => number;
  projectionTargets?: number[];
  accent?: "primary" | "violet";
};

type ProgressTone = {
  key: "red" | "yellow" | "blue" | "green";
  label: string;
  color: string;
  textClass: string;
  softClass: string;
  bubbleClass: string;
};

function progressTone(progress: number): ProgressTone {
  if (progress < 50) return { key: "red", label: "Abaixo de 50%", color: "#ef4444", textClass: "text-red-600 dark:text-red-400", softClass: "bg-red-500/10", bubbleClass: "border-red-500/45 bg-red-500/10 text-red-700 dark:text-red-300" };
  if (progress < 94) return { key: "yellow", label: "De 50% a 93,99%", color: "#eab308", textClass: "text-yellow-700 dark:text-yellow-300", softClass: "bg-yellow-500/10", bubbleClass: "border-yellow-500/45 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200" };
  if (progress < 100) return { key: "blue", label: "De 94% a 99,99%", color: "#3b82f6", textClass: "text-blue-600 dark:text-blue-400", softClass: "bg-blue-500/10", bubbleClass: "border-blue-500/45 bg-blue-500/10 text-blue-700 dark:text-blue-300" };
  return { key: "green", label: "100% ou mais", color: "#10b981", textClass: "text-emerald-600 dark:text-emerald-400", softClass: "bg-emerald-500/10", bubbleClass: "border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
}

export default function GoalCard({ title, description, progress, received, accumulated, total, tiers, daysTotal, daysElapsed, referenceGoal, dailyGoal, dailyReceived, remainingLabel, remainingValue, targetMissing, projectionTargets }: GoalCardProps) {
  const [activeTarget, setActiveTarget] = useState<number | null>(null);
  const visualProgress = Math.min(Math.max(progress, 0), 105);
  const displayedTargets = Array.from(new Set(projectionTargets ?? tiers.map(tier => tier.target)));
  const missing = (target: number) => targetMissing ? targetMissing(target) : Math.max(0, (referenceGoal * target) / 100 - received);
  const daily = (target: number) => {
    const days = Math.max(daysTotal - daysElapsed, 0);
    return days > 0 ? missing(target) / days : 0;
  };
  const tone = progressTone(progress);
  const reachedDailyGoal = dailyGoal > 0 && dailyReceived >= dailyGoal;
  const activeMissing = activeTarget === null ? null : missing(activeTarget);
  const activeDaily = activeTarget === null ? null : daily(activeTarget);
  const bubblePosition = (index: number) => {
    const angle = ((index / displayedTargets.length) * 360 - 90) * (Math.PI / 180);
    return { left: `${50 + Math.cos(angle) * 42}%`, top: `${50 + Math.sin(angle) * 42}%` };
  };

  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-border/70 bg-card shadow-[0_14px_38px_-24px_color-mix(in_oklab,var(--primary)_45%,transparent)] transition-shadow hover:shadow-[0_18px_42px_-24px_color-mix(in_oklab,var(--primary)_65%,transparent)]">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tone.softClass, tone.textClass)}><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0"><p className="text-sm font-extrabold tracking-tight">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p></div>
        </div>

        <div className="mx-auto mt-5 w-full max-w-[23rem]" onMouseLeave={() => setActiveTarget(null)}>
          <div className="relative mx-auto h-[19rem] w-full max-w-[22rem]" aria-label={`Faixas da ${title}`}>
            {displayedTargets.map((target, index) => {
              const hit = progress >= target;
              return <button
                type="button"
                key={target}
                className={cn("absolute z-10 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[11px] font-black shadow-sm transition-[transform,box-shadow,background-color] duration-200 hover:scale-110 focus:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-14 sm:w-14 sm:text-xs", hit ? tone.bubbleClass : "border-border bg-background text-muted-foreground hover:border-primary/50")}
                style={bubblePosition(index)}
                aria-label={`Faixa de ${target}% ${hit ? "atingida" : "a atingir"}. Faltam ${currency(missing(target))}.`}
                aria-pressed={activeTarget === target}
                onMouseEnter={() => setActiveTarget(target)}
                onFocus={() => setActiveTarget(target)}
                onClick={() => setActiveTarget(current => current === target ? null : target)}
              >
                <span className="flex items-center gap-0.5">{hit && <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />}{target}%</span>
              </button>;
            })}
            <div className="absolute left-1/2 top-1/2 grid h-40 w-40 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full p-[9px] shadow-inner sm:h-44 sm:w-44" role="progressbar" aria-label={`Progresso circular ${title}`} aria-valuemin={0} aria-valuemax={105} aria-valuenow={Number(visualProgress.toFixed(2))} aria-valuetext={`${progress.toFixed(2)}% — ${tone.label}`} data-progress-tone={tone.key} style={{ background: `conic-gradient(${tone.color} ${(visualProgress / 105) * 360}deg, var(--muted) 0deg)` }}>
              <div className="grid h-full w-full place-items-center rounded-full bg-card text-center shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--border)_70%,transparent)]">
                <div><p className={cn("text-4xl font-black tracking-[-0.06em]", tone.textClass)}>{progress.toFixed(2)}%</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{tone.label}</p></div>
              </div>
            </div>
          </div>
          <p className="mt-1 text-center text-[11px] font-semibold text-muted-foreground">Passe o cursor, use o foco ou toque em uma bolha para ver a faixa.</p>
          <div className="mt-3 min-h-[5.25rem] rounded-2xl border border-border/70 bg-muted/35 p-3 text-center" aria-live="polite">
            {activeTarget === null ? <p className="pt-2 text-xs text-muted-foreground">As bolhas com check já foram atingidas.</p> : <><p className="text-xs font-black">Falta para {activeTarget}%: <span className={tone.textClass}>{currency(activeMissing ?? 0)}</span></p><p className="mt-1 text-[11px] text-muted-foreground">Saldo por dia para esta faixa: <span className="font-extrabold text-foreground">{currency(activeDaily ?? 0)}</span></p></>}
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-border/60 pt-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-muted/45 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Recebido acumulado</p><p className="mt-1 text-sm font-black">{currency(received)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">Premiação: {currency(accumulated)} de {currency(total)}</p></div>
          {remainingLabel && typeof remainingValue === "number" && <div className="rounded-2xl bg-muted/45 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{remainingLabel}</p><p className="mt-1 text-sm font-black">{currency(remainingValue)}</p></div>}
          <div className={cn("rounded-2xl border p-3 sm:col-span-2", dailyGoal > 0 ? reachedDailyGoal ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10" : "border-border/70 bg-muted/45")}>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Meta diária / Rec. hoje</p><p className={cn("mt-1 text-sm font-black", dailyGoal > 0 && (reachedDailyGoal ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"))}>{currency(dailyGoal)} / {currency(dailyReceived)}</p><p className={cn("mt-0.5 text-[11px] font-semibold", dailyGoal > 0 ? reachedDailyGoal ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300" : "text-muted-foreground")}>{dailyGoal > 0 ? reachedDailyGoal ? "Meta diária atingida" : "Meta diária ainda não atingida" : "Informe as metas para acompanhar"}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
