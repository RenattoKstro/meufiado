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
  targetMissing?: (target: number) => number;
  projectionTargets?: number[];
  accent?: "primary" | "violet";
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

export default function GoalCard({ title, description, progress, received, accumulated, total, tiers, daysTotal, daysElapsed, referenceGoal, targetMissing, projectionTargets, accent = "primary" }: GoalCardProps) {
  const [open, setOpen] = useState(false);
  const visualProgress = Math.min(progress, 105);
  const displayedTargets = Array.from(new Set(projectionTargets ?? tiers.map(tier => tier.target)));
  const missing = (target: number) => targetMissing ? targetMissing(target) : Math.max(0, (referenceGoal * target) / 100 - received);
  const daily = (target: number) => {
    const days = Math.max(daysTotal - daysElapsed, 0);
    return days > 0 ? missing(target) / days : 0;
  };

  return (
    <article className={cn("overflow-hidden rounded-[1.6rem] border border-border/70 bg-card shadow-[0_14px_38px_-24px_color-mix(in_oklab,var(--primary)_45%,transparent)] transition-shadow hover:shadow-[0_18px_42px_-24px_color-mix(in_oklab,var(--primary)_65%,transparent)]", accent === "violet" && "[--primary:oklch(0.52_0.22_292)]")}>
      <button onClick={() => setOpen(current => !current)} className="block w-full p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2"><span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></span><p className="text-sm font-extrabold tracking-tight">{title}</p></div>
            <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <Badge variant="secondary" className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary">{progress.toFixed(1)}%</Badge>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex items-end justify-between"><div><p className="text-2xl font-black tracking-tight">{currency(accumulated)}</p><p className="text-[11px] font-medium text-muted-foreground">de {currency(total)} possíveis</p></div><p className="text-right text-[11px] font-semibold text-muted-foreground">Recebido acumulado<br /><span className="text-foreground">{currency(received)}</span></p></div>
          <Progress value={Math.min((progress / 105) * 100, 100)} className="h-2.5 bg-muted [&>div]:bg-primary" />
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-xs font-bold text-muted-foreground"><span>{open ? "Ocultar projeções" : "Ver faixas e projeções"}</span><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></div>
      </button>
      {open && <div className="border-t border-border/70 bg-muted/35 p-5">
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
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Progresso da faixa ${tier.target}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(tierProgress.toFixed(1))} aria-valuetext={`${tierProgress.toFixed(1)}% rumo à faixa de ${tier.target}%`}><div className={cn("h-full rounded-full transition-[width] duration-500", palette.bar)} style={{ width: `${tierProgress}%` }} /></div>
            </div>;
          })}
        </div>
      </div>}
    </article>
  );
}
