import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme, type Palette } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { automaticWorkingDays } from "@shared/workingDays";
import { parsePastedCurrency } from "@shared/currencyInput";
import { CalendarClock, CalendarPlus, Check, Database, Loader2, Moon, Palette as PaletteIcon, Save, Sun, Trash2 } from "lucide-react";
import React, { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

const paletteOptions: { id: Palette; label: string; colors: string[] }[] = [
  { id: "ocean", label: "Oceano", colors: ["#0b85c8", "#12b9c6", "#062f55"] },
  { id: "violet", label: "Violeta", colors: ["#7757d9", "#b06ce8", "#34206b"] },
  { id: "forest", label: "Floresta", colors: ["#248052", "#77b846", "#164337"] },
  { id: "sunset", label: "Pôr do sol", colors: ["#db5c2d", "#f2a53b", "#673320"] },
  { id: "rose", label: "Rosé", colors: ["#c74477", "#ec7fa7", "#6e2446"] },
  { id: "midnight", label: "Meia-noite", colors: ["#3156a6", "#4c86d9", "#1d2d5d"] },
  { id: "citrus", label: "Cítrico", colors: ["#a76b05", "#d2a311", "#5b4107"] },
  { id: "slate", label: "Ardósia", colors: ["#3f6472", "#7396a3", "#243a44"] },
];

const initialMetrics = {
  portfolioTotal: 0,
  monthOpening: 0,
  dayOpening: 0,
  currentOverdue: 0,
  creditGoal: 0,
  challengeGoal: 0,
  lostGoal: 0,
  lostReceived: 0,
  workingDaysMode: "automatic" as "automatic" | "manual",
  countToday: true,
  includeSaturday: true,
  includeSunday: false,
  workingDaysTotal: 0,
  workingDaysElapsed: 0,
  ticketWorkingDaysRemaining: 0,
  manualHolidayDates: [] as string[],
  fiadoAtDay15: false,
};

function brazilCalendarDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (kind: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === kind)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function isCurrentCalendarDate(date: string) {
  const today = brazilCalendarDate();
  const candidate = new Date(`${date}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date.slice(0, 7) === today.slice(0, 7) && !Number.isNaN(candidate.getTime());
}

function formatMoneyInput(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}

function CurrencyInput({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(() => formatMoneyInput(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(formatMoneyInput(value));
  }, [focused, value]);
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type="text" inputMode="decimal" value={draft} onFocus={() => { setFocused(true); setDraft(value ? String(value).replace(".", ",") : ""); }} onChange={event => setDraft(event.target.value)} onBlur={() => { const parsed = Math.round(parsePastedCurrency(draft) * 100) / 100; onChange(parsed); setDraft(formatMoneyInput(parsed)); setFocused(false); }} /></div>;
}

export function MetricsSettings() {
  const { user } = useAuth();
  const metricsQuery = trpc.metrics.mine.useQuery();
  const profileQuery = trpc.profile.mine.useQuery();
  const subscriptionQuery = trpc.subscription.mine.useQuery();
  const save = trpc.metrics.save.useMutation();
  const autofillFromMatrix = trpc.metrics.autofillFromMatrix.useMutation();
  const preferences = trpc.profile.preferences.useMutation();
  const [form, setForm] = useState(initialMetrics);
  const [holidayDate, setHolidayDate] = useState("");

  useEffect(() => {
    if (metricsQuery.data) {
      setForm({
        ...metricsQuery.data,
        workingDaysMode: metricsQuery.data.workingDaysMode === "manual" ? "manual" : "automatic",
        countToday: metricsQuery.data.countToday ?? true,
        includeSaturday: metricsQuery.data.includeSaturday ?? true,
        includeSunday: metricsQuery.data.includeSunday ?? false,
        manualHolidayDates: metricsQuery.data.manualHolidayDates ?? [],
      });
    }
  }, [metricsQuery.data]);

  const updateNumber = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: Number(value.replace(",", ".")) || 0 }));
  const selectWorkingDaysMode = (workingDaysMode: "automatic" | "manual") => {
    if (workingDaysMode === "manual") {
      setForm(current => ({ ...current, workingDaysMode }));
      return;
    }
    setForm(current => ({ ...current, workingDaysMode, ...automaticWorkingDays(new Date(), current) }));
  };

  const updateCalendarOption = (field: "countToday" | "includeSaturday" | "includeSunday", checked: boolean) => {
    setForm(current => {
      const next = { ...current, [field]: checked };
      return next.workingDaysMode === "automatic" ? { ...next, ...automaticWorkingDays(new Date(), next) } : next;
    });
  };

  const adjustHoliday = (date: string, operation: "add" | "remove") => {
    if (!isCurrentCalendarDate(date)) {
      toast.message("Selecione uma data válida do mês atual para incluir ou remover como feriado.");
      return;
    }
    setForm(current => {
      const exists = current.manualHolidayDates.includes(date);
      if ((operation === "add" && exists) || (operation === "remove" && !exists)) return current;
      const manualHolidayDates = operation === "add" ? [...current.manualHolidayDates, date].sort() : current.manualHolidayDates.filter(value => value !== date);
      const next = { ...current, manualHolidayDates };
      if (next.workingDaysMode === "automatic") return { ...next, ...automaticWorkingDays(new Date(), next) };
      const todayDay = Number(brazilCalendarDate().slice(-2));
      const holidayDay = Number(date.slice(-2));
      const direction = operation === "add" ? -1 : 1;
      return {
        ...next,
        workingDaysTotal: Math.max(0, next.workingDaysTotal + (holidayDay > todayDay ? direction : 0)),
        workingDaysElapsed: Math.max(0, next.workingDaysElapsed + (holidayDay <= todayDay ? direction : 0)),
        ticketWorkingDaysRemaining: Math.max(0, next.ticketWorkingDaysRemaining + (holidayDay > todayDay && holidayDay <= 15 ? direction : 0)),
      };
    });
    if (operation === "add") setHolidayDate("");
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await save.mutateAsync(form);
      toast.success("Ajustes salvos. O painel foi atualizado.");
    } catch {
      toast.error("Não foi possível salvar os ajustes.");
    }
  }

  async function loadFromMatrix() {
    if (subscriptionQuery.isLoading) {
      toast.message("Verificando o acesso à importação automática.");
      return;
    }
    const hasProAccess = user?.role === "admin" || subscriptionQuery.data?.isPro;
    if (!hasProAccess) {
      toast.message("O preenchimento automático da Matriz está disponível para usuários PRO.", {
        action: { label: "Ver plano", onClick: () => { window.location.assign("/plano"); } },
      });
      return;
    }
    try {
      const importedMetrics = await autofillFromMatrix.mutateAsync();
      setForm(current => ({ ...current, ...importedMetrics }));
      toast.success("Dados da Matriz carregados. Confirme em Salvar ajustes para aplicar.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível carregar os dados da Matriz.";
      toast.error(message);
    }
  }

  async function setTicketVisibility(showTicketGoal: boolean) {
    try {
      await preferences.mutateAsync({ showTicketGoal });
      await profileQuery.refetch();
      toast.success(showTicketGoal ? "Cards da Meta Alimentação exibidos." : "Cards da Meta Alimentação ocultados.");
    } catch {
      toast.error("Não foi possível atualizar a visibilidade da Meta Alimentação.");
    }
  }

  async function setPossibleRewardsVisibility(showPossibleRewards: boolean) {
    try {
      await preferences.mutateAsync({ showPossibleRewards });
      await profileQuery.refetch();
      toast.success(showPossibleRewards ? "Valores possíveis exibidos." : "Valores possíveis ocultados.");
    } catch {
      toast.error("Não foi possível atualizar a visibilidade dos valores possíveis.");
    }
  }

  async function setRewardAmountsVisibility(showRewardAmounts: boolean) {
    try {
      await preferences.mutateAsync({ showRewardAmounts });
      await profileQuery.refetch();
      toast.success(showRewardAmounts ? "Premiações exibidas nos cards." : "Premiações ocultadas nos cards.");
    } catch {
      toast.error("Não foi possível atualizar a visibilidade das premiações.");
    }
  }

  async function toggleVacation(isOnVacation: boolean) {
    await preferences.mutateAsync({ isOnVacation });
    await profileQuery.refetch();
    toast.success(isOnVacation ? "Status de férias ativado." : "Status de férias desativado.");
  }

  async function setLostGoal(showLostGoal: boolean) {
    try {
      await preferences.mutateAsync({ showLostGoal });
      await profileQuery.refetch();
      toast.success(showLostGoal ? "Meta Perdido exibida no painel." : "Meta Perdido ocultada do painel.");
    } catch {
      toast.error("Não foi possível atualizar a Meta Perdido.");
    }
  }

  if (metricsQuery.isLoading || profileQuery.isLoading) return <SettingsLoading />;
  if (user?.role === "admin" && !profileQuery.data?.profile?.branchId) return <AdminSettingsNotice />;
  if (!metricsQuery.data || !profileQuery.data?.profile) return <SettingsLoading />;

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "portfolioTotal", label: "Carteira total" },
    { key: "monthOpening", label: "Abertura do mês" },
    { key: "dayOpening", label: "Abertura do dia" },
    { key: "currentOverdue", label: "Vencido atual" },
    { key: "creditGoal", label: "Meta Fiado" },
    { key: "challengeGoal", label: "Meta Desafio" },
  ];
  const isAutomatic = form.workingDaysMode === "automatic";

  return (
    <section className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Base de cálculo</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Ajustes de metas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Informe os valores manualmente</p>
      </header>

      <form onSubmit={submit} className="space-y-5">
        <Card className="rounded-[1.6rem] border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-lg">Indicadores de cobrança</CardTitle>
                <CardDescription className="mt-1.5">Atualize estes campos sempre que precisar revisar sua projeção.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={loadFromMatrix} disabled={autofillFromMatrix.isPending} className="h-10 shrink-0 rounded-xl border-primary/25 bg-primary/5 font-extrabold text-primary hover:bg-primary/10 hover:text-primary">
                {autofillFromMatrix.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}Preencher com a Matriz
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input id={field.key} type="number" min="0" step="0.01" value={form[field.key] as number} onChange={event => updateNumber(field.key, event.target.value)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="rounded-[1.6rem] border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Meta Perdido</CardTitle>
              <CardDescription>Ative esta meta quando ela fizer parte da sua premiação e informe os valores abaixo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4">
                <div>
                  <p className="text-sm font-extrabold">Ativar Meta Perdido</p>
                  <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-muted-foreground">Exibe as faixas de 100% e 105% com premiação total de R$ 700,00.</p>
                </div>
                <Switch checked={profileQuery.data.profile.showLostGoal ?? false} onCheckedChange={setLostGoal} disabled={preferences.isPending} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CurrencyInput id="lost-goal" label="Meta Perdido" value={form.lostGoal} onChange={value => setForm(current => ({ ...current, lostGoal: value }))} />
                <CurrencyInput id="lost-received" label="Recebido Perdido" value={form.lostReceived} onChange={value => setForm(current => ({ ...current, lostReceived: value }))} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.6rem] border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><CalendarClock className="h-5 w-5 text-primary" />Calendário e Meta 80%</CardTitle>
              <CardDescription>A Meta 80% considera o período de 1º a 15. No modo manual, você também pode excluir feriados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-background/70 p-3"><div><p className="text-xs font-extrabold">Mostrar Meta Alimentação</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Exibe os cards, a meta, o recebido hoje e o ritmo até o dia 15.</p></div><Switch checked={profileQuery.data.profile.showTicketGoal ?? true} onCheckedChange={setTicketVisibility} disabled={preferences.isPending} /></div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-background/70 p-3"><div><p className="text-xs font-extrabold">Mostrar valores possíveis</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Exibe os valores máximos de premiação nos cards.</p></div><Switch checked={profileQuery.data.profile.showPossibleRewards ?? true} onCheckedChange={setPossibleRewardsVisibility} disabled={preferences.isPending} /></div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-background/70 p-3"><div><p className="text-xs font-extrabold">Mostrar premiação</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Exibe o valor já ganho em Fiado, Desafio, Alimentação e Perdido.</p></div><Switch checked={profileQuery.data.profile.showRewardAmounts ?? true} onCheckedChange={setRewardAmountsVisibility} disabled={preferences.isPending} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Modo de dias úteis">
                <button type="button" role="radio" aria-checked={isAutomatic} onClick={() => selectWorkingDaysMode("automatic")} className={`rounded-xl border p-3 text-left transition-colors ${isAutomatic ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:bg-muted/50"}`}><p className="text-sm font-extrabold">Automático</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Calcula o mês atual conforme as opções de calendário abaixo.</p></button>
                <button type="button" role="radio" aria-checked={!isAutomatic} onClick={() => selectWorkingDaysMode("manual")} className={`rounded-xl border p-3 text-left transition-colors ${!isAutomatic ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:bg-muted/50"}`}><p className="text-sm font-extrabold">Manual</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Você informa os dias e pode excluir feriados.</p></button>
              </div>
              <div className="grid gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 sm:grid-cols-3">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-background/70 p-3"><div><p className="text-xs font-extrabold">Contar com o dia atual</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Inclui hoje nos dias trabalhados e na Meta 80%.</p></div><Switch checked={form.countToday} onCheckedChange={checked => updateCalendarOption("countToday", checked)} /></div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-background/70 p-3"><div><p className="text-xs font-extrabold">Incluir sábado</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Sábados entram na contagem.</p></div><Switch checked={form.includeSaturday} onCheckedChange={checked => updateCalendarOption("includeSaturday", checked)} /></div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-background/70 p-3"><div><p className="text-xs font-extrabold">Incluir domingo</p><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Domingos entram na contagem.</p></div><Switch checked={form.includeSunday} onCheckedChange={checked => updateCalendarOption("includeSunday", checked)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Dias úteis restantes</Label><Input type="number" min="0" max="31" disabled={isAutomatic} value={form.workingDaysTotal} onChange={event => updateNumber("workingDaysTotal", event.target.value)} /></div>
                <div className="space-y-2"><Label>Dias úteis trabalhados</Label><Input type="number" min="0" max="31" disabled={isAutomatic} value={form.workingDaysElapsed} onChange={event => updateNumber("workingDaysElapsed", event.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Dias úteis restantes até dia 15</Label><Input type="number" min="0" max="15" disabled={isAutomatic} value={form.ticketWorkingDaysRemaining} onChange={event => updateNumber("ticketWorkingDaysRemaining", event.target.value)} /><p className="text-[11px] leading-relaxed text-muted-foreground">{isAutomatic ? "Atualizado pelo calendário atual e pelas opções de hoje, sábado, domingo e feriados." : "Informe os dias da filial; os feriados abaixo ajustam os totais automaticamente."}</p></div>
              <div className="rounded-2xl border border-border/70 bg-muted/25 p-4"><Label htmlFor="manual-holiday">Excluir dia como feriado</Label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input id="manual-holiday" type="date" value={holidayDate} onChange={event => setHolidayDate(event.target.value)} /><Button type="button" variant="outline" onClick={() => adjustHoliday(holidayDate, "add")} disabled={!holidayDate} className="shrink-0 rounded-xl font-bold"><CalendarPlus className="mr-2 h-4 w-4" />Excluir dia</Button></div><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">O dia excluído fica salvo para este mês e reduz a contagem automática ou os totais manuais, quando aplicável.</p>{form.manualHolidayDates.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{form.manualHolidayDates.map(date => <span key={date} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold"><span>{new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR")}</span><button type="button" aria-label={`Remover feriado ${date}`} onClick={() => adjustHoliday(date, "remove")} className="rounded-full text-muted-foreground transition-colors hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></span>)}</div>}</div>
              <div className="rounded-xl bg-muted/60 px-3 py-3"><p className="text-xs font-extrabold">Validação automática</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Até o dia 15, o sistema acompanha 80% do valor a receber. Após o prazo, sem atingimento registrado, a Meta Ticket fica não atingida.</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
          <div><p className="text-sm font-extrabold">Estou de férias</p><p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">Marque esta opção durante sua ausência. Assim, a administração identifica o período e seu cadastro não será inativado por falta de acesso.</p></div>
          <Switch className="scale-90" checked={profileQuery.data.profile.isOnVacation} onCheckedChange={toggleVacation} disabled={preferences.isPending} />
        </div>
        <div className="flex justify-end"><Button type="submit" size="lg" className="h-11 rounded-xl px-6 font-extrabold" disabled={save.isPending}>{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar ajustes</Button></div>
      </form>
    </section>
  );
}

export function AppearanceSettings() {
  const { user } = useAuth();
  const profileQuery = trpc.profile.mine.useQuery();
  const preferences = trpc.profile.preferences.useMutation();
  const { theme, palette, setTheme, setPalette } = useTheme();
  const utils = trpc.useUtils();

  if (profileQuery.isLoading) return <SettingsLoading />;
  const profile = profileQuery.data?.profile;
  if (!profile && user?.role !== "admin") return <SettingsLoading />;

  async function changeAppearance(nextTheme: "light" | "dark", nextPalette: Palette) {
    setTheme(nextTheme);
    setPalette(nextPalette);
    try {
      await preferences.mutateAsync({ colorMode: nextTheme, colorPalette: nextPalette });
      await utils.profile.mine.invalidate();
    } catch {
      toast.error("A preferência será aplicada apenas neste dispositivo por enquanto.");
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Experiência pessoal</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Configurações</h1>
        <p className="mt-2 text-sm text-muted-foreground">Deixe o ambiente de trabalho mais confortável com o tema e a paleta que preferir.</p>
      </header>
      <Card className="max-w-2xl rounded-[1.6rem] border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><PaletteIcon className="h-5 w-5 text-primary" />Tema e paleta</CardTitle>
          <CardDescription>Suas escolhas são salvas no seu perfil.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => changeAppearance("light", palette)} className={`rounded-2xl border p-4 text-left transition-all ${theme === "light" ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:bg-muted/60"}`}><Sun className="h-5 w-5 text-primary" /><p className="mt-5 text-sm font-extrabold">Claro</p><p className="mt-1 text-[11px] text-muted-foreground">Mais luminosidade e foco</p></button>
            <button onClick={() => changeAppearance("dark", palette)} className={`rounded-2xl border p-4 text-left transition-all ${theme === "dark" ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:bg-muted/60"}`}><Moon className="h-5 w-5 text-primary" /><p className="mt-5 text-sm font-extrabold">Escuro</p><p className="mt-1 text-[11px] text-muted-foreground">Conforto em baixa luz</p></button>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {paletteOptions.map(option => (
              <button key={option.id} onClick={() => changeAppearance(theme, option.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${palette === option.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"}`}>
                <span className="flex -space-x-1.5">{option.colors.map(color => <span key={color} className="h-5 w-5 rounded-full border-2 border-card" style={{ background: color }} />)}</span>
                <span className="text-xs font-extrabold">{option.label}</span>
                {palette === option.id && <Check className="ml-auto h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function AdminSettingsNotice() {
  return <section className="mx-auto max-w-4xl"><Card className="rounded-[1.8rem] border-primary/20 shadow-sm"><CardContent className="p-7 sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Modo administrador</p><h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Ajustes de metas</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Você pode acessar esta área sem filial vinculada. Para alterar valores de cobrança, abra a filial correspondente em <strong className="font-extrabold text-foreground">Filiais</strong> ou vincule uma conta operacional.</p></CardContent></Card></section>;
}

function SettingsLoading() {
  return <div className="mx-auto max-w-5xl"><div className="h-8 w-60 animate-pulse rounded-lg bg-muted" /><div className="mt-8 h-96 animate-pulse rounded-[1.6rem] bg-muted" /></div>;
}
