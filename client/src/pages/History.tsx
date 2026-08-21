import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, PencilLine, Plus, ReceiptText, Trash2, TrendingUp } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type HistoryEntry = {
  id: number;
  entryDate: string;
  receivedAmount: number;
  updatedAt: Date | string;
};

function brazilDateParts(date = new Date()) {
  const fields = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(date)
    .reduce<Record<string, string>>((parts, part) => ({ ...parts, [part.type]: part.value }), {});
  return { year: fields.year, month: fields.month, day: fields.day };
}

function currentMonth() {
  const { year, month } = brazilDateParts();
  return `${year}-${month}`;
}

function currentDate() {
  const { year, month, day } = brazilDateParts();
  return `${year}-${month}-${day}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function changeMonth(month: string, direction: -1 | 1) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + direction, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function displayUpdate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
}

function EntryDialog({ entry, onSaved, children }: { entry: HistoryEntry; onSaved: () => Promise<unknown>; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(entry.entryDate);
  const [receivedAmount, setReceivedAmount] = useState(String(entry.receivedAmount));
  const update = trpc.history.update.useMutation();

  useEffect(() => {
    if (open) {
      setEntryDate(entry.entryDate);
      setReceivedAmount(String(entry.receivedAmount));
    }
  }, [entry, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(receivedAmount);
    if (!entryDate || !Number.isFinite(amount) || amount < 0) return toast.error("Informe uma data e um valor de recebimento válidos.");
    try {
      await update.mutateAsync({ id: entry.id, data: { entryDate, receivedAmount: amount } });
      await onSaved();
      setOpen(false);
      toast.success("Lançamento atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o lançamento.");
    }
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children}</DialogTrigger><DialogContent className="rounded-[1.6rem] sm:max-w-lg"><DialogHeader><DialogTitle>Editar recebimento</DialogTitle><DialogDescription>Atualize a data ou o valor deste lançamento diário.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor={`history-edit-date-${entry.id}`}>Data</Label><Input id={`history-edit-date-${entry.id}`} type="date" value={entryDate} onChange={event => setEntryDate(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor={`history-edit-amount-${entry.id}`}>Recebido no dia</Label><Input id={`history-edit-amount-${entry.id}`} type="number" min="0" step="0.01" inputMode="decimal" value={receivedAmount} onChange={event => setReceivedAmount(event.target.value)} required /></div><Button type="submit" className="w-full" disabled={update.isPending}>{update.isPending ? "Salvando…" : "Salvar alterações"}</Button></form></DialogContent></Dialog>;
}

export default function History() {
  const [month, setMonth] = useState(currentMonth);
  const [entryDate, setEntryDate] = useState(currentDate);
  const [receivedAmount, setReceivedAmount] = useState("");
  const utils = trpc.useUtils();
  const profileQuery = trpc.profile.mine.useQuery();
  const hasBranch = Boolean(profileQuery.data?.profile?.branchId);
  const historyQuery = trpc.history.list.useQuery({ month }, { enabled: hasBranch });
  const create = trpc.history.create.useMutation();
  const remove = trpc.history.delete.useMutation();
  const history = historyQuery.data;
  const entries = (history?.entries ?? []) as HistoryEntry[];
  const canShowData = hasBranch && !profileQuery.isLoading;
  const selectedMonthLabel = useMemo(() => monthLabel(month), [month]);

  useEffect(() => {
    if (!entryDate.startsWith(month)) setEntryDate(`${month}-01`);
  }, [entryDate, month]);

  async function refreshHistory() {
    await utils.history.list.invalidate();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(receivedAmount);
    if (!entryDate || !Number.isFinite(amount) || amount < 0) return toast.error("Informe uma data e um valor de recebimento válidos.");
    try {
      await create.mutateAsync({ entryDate, receivedAmount: amount });
      setMonth(entryDate.slice(0, 7));
      setReceivedAmount("");
      await refreshHistory();
      toast.success("Recebimento diário salvo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o recebimento.");
    }
  }

  async function removeEntry(id: number) {
    if (!window.confirm("Excluir este lançamento diário? Esta ação não poderá ser desfeita.")) return;
    try {
      await remove.mutateAsync({ id });
      await refreshHistory();
      toast.success("Lançamento excluído.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o lançamento.");
    }
  }

  if (profileQuery.isLoading) return <section className="mx-auto max-w-6xl py-16 text-center text-sm text-muted-foreground">Carregando históricos…</section>;
  if (!canShowData) return <section className="mx-auto grid min-h-[58vh] max-w-2xl place-items-center"><Card className="w-full rounded-[1.8rem] border-border/70 text-center shadow-sm"><CardContent className="p-8 sm:p-10"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ClipboardList className="h-6 w-6" /></span><h1 className="mt-5 text-2xl font-black tracking-tight">Históricos por filial</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Vincule seu perfil a uma filial para registrar os recebimentos diários e acompanhar o consolidado mensal.</p></CardContent></Card></section>;

  return <section className="mx-auto max-w-6xl space-y-6"><header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Recebimentos registrados</p><h1 className="mt-1 text-3xl font-black tracking-tight">Históricos</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Registre o total recebido a cada dia. Líder e auxiliar compartilham o mesmo histórico da filial.</p></div><div className="flex items-center gap-2 self-start rounded-2xl border border-border bg-card p-1.5 shadow-sm lg:self-auto"><Button type="button" variant="ghost" size="icon" className="rounded-xl" aria-label="Mês anterior" onClick={() => setMonth(value => changeMonth(value, -1))}><ChevronLeft className="h-4 w-4" /></Button><div className="min-w-44 text-center"><p className="text-sm font-extrabold capitalize">{selectedMonthLabel}</p><input aria-label="Selecionar mês" type="month" value={month} onChange={event => setMonth(event.target.value)} className="mt-0.5 w-full cursor-pointer bg-transparent text-center text-[11px] font-semibold text-muted-foreground outline-none" /></div><Button type="button" variant="ghost" size="icon" className="rounded-xl" aria-label="Próximo mês" onClick={() => setMonth(value => changeMonth(value, 1))}><ChevronRight className="h-4 w-4" /></Button></div></header>

    <div className="grid gap-4 sm:grid-cols-3"><SummaryCard icon={CircleDollarSign} label="Recebido no mês" value={money(history?.totalReceived ?? 0)} hint="Soma dos dias salvos" /><SummaryCard icon={CalendarDays} label="Dias registrados" value={String(history?.daysRecorded ?? 0)} hint="Lançamentos na filial" /><SummaryCard icon={TrendingUp} label="Média por dia" value={money(history?.averagePerDay ?? 0)} hint="Considera dias registrados" /></div>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><Card className="h-fit rounded-[1.7rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary"><Plus className="h-4 w-4" /></span>Novo lançamento</CardTitle><CardDescription>Registre o valor total recebido em um dia. Cada data possui um único lançamento por filial.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="history-entry-date">Data do recebimento</Label><Input id="history-entry-date" type="date" value={entryDate} onChange={event => setEntryDate(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="history-entry-amount">Valor recebido</Label><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-muted-foreground">R$</span><Input id="history-entry-amount" className="pl-10" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0,00" value={receivedAmount} onChange={event => setReceivedAmount(event.target.value)} required /></div></div><Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Salvando…" : "Salvar recebimento"}</Button></form></CardContent></Card>

      <Card className="rounded-[1.7rem] border-border/70 shadow-sm"><CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />Lançamentos de {selectedMonthLabel}</CardTitle><CardDescription className="mt-1">Edite ou exclua um registro sempre que precisar corrigir o valor informado.</CardDescription></div><Badge variant="secondary" className="shrink-0">{entries.length} {entries.length === 1 ? "dia" : "dias"}</Badge></CardHeader><CardContent>{historyQuery.isLoading ? <p className="py-12 text-center text-sm text-muted-foreground">Carregando lançamentos…</p> : historyQuery.isError ? <div className="py-12 text-center"><p className="text-sm font-bold text-destructive">Não foi possível carregar os históricos.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void historyQuery.refetch()}>Tentar novamente</Button></div> : entries.length ? <div className="overflow-hidden rounded-2xl border border-border/70"><div className="hidden grid-cols-[1fr_1fr_1fr_auto] gap-3 bg-muted/45 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:grid"><span>Data</span><span>Recebido</span><span>Atualizado em</span><span className="text-right">Ações</span></div><div className="divide-y divide-border/70">{entries.map(entry => <article key={entry.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:hidden">Data</p><p className="font-extrabold">{displayDate(entry.entryDate)}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:hidden">Recebido</p><p className="font-black text-primary">{money(entry.receivedAmount)}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:hidden">Atualizado em</p><p className="text-xs text-muted-foreground">{displayUpdate(entry.updatedAt)}</p></div><div className="flex justify-start gap-1 sm:justify-end"><EntryDialog entry={entry} onSaved={refreshHistory}><Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl" aria-label={`Editar lançamento de ${displayDate(entry.entryDate)}`}><PencilLine className="h-4 w-4" /></Button></EntryDialog><Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-destructive hover:text-destructive" aria-label={`Excluir lançamento de ${displayDate(entry.entryDate)}`} disabled={remove.isPending} onClick={() => void removeEntry(entry.id)}><Trash2 className="h-4 w-4" /></Button></div></article>)}</div></div> : <div className="grid min-h-60 place-items-center rounded-2xl border border-dashed border-border p-6 text-center"><div><ReceiptText className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 font-bold">Nenhum recebimento salvo neste mês.</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">Use o formulário ao lado para registrar o primeiro dia de recebimento.</p></div></div>}</CardContent></Card></div></section>;
}

function SummaryCard({ icon: Icon, label, value, hint }: { icon: typeof CircleDollarSign; label: string; value: string; hint: string }) {
  return <Card className="rounded-[1.5rem] border-border/70 shadow-sm"><CardContent className="p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.11em] text-muted-foreground">{label}</p><p className="mt-1 text-xl font-black tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></div></div></CardContent></Card>;
}
