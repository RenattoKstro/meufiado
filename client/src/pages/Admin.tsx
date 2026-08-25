import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Activity, Building2, CalendarOff, CheckCircle2, FileSpreadsheet, KeyRound, Loader2, Mail, MessageCircle, Phone, Trash2, UploadCloud, UserPlus, Users } from "lucide-react";
import React, { ChangeEvent, FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import { analyticRowFromSpreadsheet, branchRowFromSpreadsheet } from "../../../shared/importRules";
import AdminContactActions from "@/components/AdminContactActions";
import SubscriptionAdminPanel from "@/components/SubscriptionAdminPanel";
import AppTextSettingsPanel from "@/components/AppTextSettingsPanel";
import { collectionProjectionRisk } from "../../../shared/collectionInsights";

const INACTIVITY_DAYS = 7;
type SpreadsheetRow = (string | number | null)[];
type Branch = { id: number; name: string; code: string | null; regional: string | null; isActive: boolean };
type BranchOverview = { branch: Branch; metrics: { portfolioTotal: number; monthOpening: number; currentOverdue: number; creditGoal: number; workingDaysTotal: number; workingDaysElapsed: number } };

export default function Admin() {
  const usersQuery = trpc.admin.users.useQuery();
  const branchesQuery = trpc.admin.branches.useQuery();
  const overviewQuery = trpc.branches.overview.useQuery();
  const updateUser = trpc.admin.updateUser.useMutation();
  const updateRole = trpc.admin.updateRole.useMutation();
  const utils = trpc.useUtils();
  const users = usersQuery.data || [];
  const now = Date.now();
  const inactive = users.filter(item => !item.account?.lastSignedIn || now - new Date(item.account.lastSignedIn).getTime() > INACTIVITY_DAYS * 86400000);
  const vacation = users.filter(item => item.profile.isOnVacation);
  const active = users.filter(item => item.profile.isActive);

  async function refresh() {
    await Promise.all([utils.admin.users.invalidate(), utils.admin.branches.invalidate(), utils.profile.branches.invalidate()]);
  }
  async function changeUser(id: number, input: { isActive?: boolean; isOnVacation?: boolean; operatorType?: "leader" | "assistant" }) {
    try { await updateUser.mutateAsync({ id, ...input }); await refresh(); toast.success("Cadastro atualizado."); }
    catch { toast.error("Não foi possível atualizar o cadastro."); }
  }
  async function changeRole(userId: number, role: "admin" | "user") {
    try { await updateRole.mutateAsync({ userId, role }); await refresh(); toast.success("Permissão atualizada."); }
    catch { toast.error("Não foi possível alterar a permissão."); }
  }
  
  if (usersQuery.isLoading || branchesQuery.isLoading) return <AdminLoading />;
  if (usersQuery.isError || branchesQuery.isError) return <AdminError onRetry={() => { void Promise.all([usersQuery.refetch(), branchesQuery.refetch()]); }} />;
  const branches = branchesQuery.data || [];
  return <section className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Gestão da operação</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Painel administrativo</h1><p className="mt-2 text-sm text-muted-foreground">Gerencie usuários, filiais, metas e importações da operação.</p></div>
      <div className="flex flex-wrap gap-2"><CredentialsDialog /><SpreadsheetImportDialog kind="branches" onComplete={refresh} /><SpreadsheetImportDialog kind="analytics" onComplete={refresh} /><BranchDialog onComplete={refresh} /><UserDialog branches={branches} onComplete={refresh} /></div>
    </header>
    <div className="grid gap-4 sm:grid-cols-3"><Stat icon={Users} label="Usuários ativos" value={active.length} tone="primary" /><Stat icon={CalendarOff} label="Em férias" value={vacation.length} tone="amber" /><Stat icon={Activity} label={`Inativos há ${INACTIVITY_DAYS}+ dias`} value={inactive.length} tone="violet" /></div>
    <ManagementOverview rows={(overviewQuery.data ?? []) as BranchOverview[]} isLoading={overviewQuery.isLoading} />
    <AdminContactActions users={users} onChanged={refresh} />
    <Tabs defaultValue="users" className="mt-7">
      <TabsList className="h-auto flex-wrap rounded-xl bg-muted p-1"><TabsTrigger value="users" className="rounded-lg px-4 py-2 text-xs font-bold">Usuários</TabsTrigger><TabsTrigger value="branches" className="rounded-lg px-4 py-2 text-xs font-bold">Filiais</TabsTrigger><TabsTrigger value="subscriptions" className="rounded-lg px-4 py-2 text-xs font-bold">Assinaturas</TabsTrigger><TabsTrigger value="texts" className="rounded-lg px-4 py-2 text-xs font-bold">Textos</TabsTrigger><TabsTrigger value="alerts" className="rounded-lg px-4 py-2 text-xs font-bold">Atenções</TabsTrigger></TabsList>
      <TabsContent value="users" className="mt-5"><Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader className="border-b border-border/70"><CardTitle className="text-lg">Operadores cadastrados</CardTitle><CardDescription>Ative ou desative acessos, altere a função e conceda perfil administrativo.</CardDescription></CardHeader><CardContent className="p-0"><div className="divide-y divide-border/70">{users.length === 0 ? <EmptyState text="Ainda não há operadores cadastrados." /> : users.map(item => { const hasAccount = Boolean(item.account); const idleDays = item.account?.lastSignedIn ? Math.floor((now - new Date(item.account.lastSignedIn).getTime()) / 86400000) : undefined; return <div key={item.profile.id} className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-extrabold">{item.profile.fullName}</p>{!item.profile.isActive && <Badge variant="secondary" className="rounded-full bg-destructive/10 text-destructive">Inativo</Badge>}{item.profile.isOnVacation && <Badge variant="secondary" className="rounded-full bg-amber-500/10 text-amber-600">Férias</Badge>}{hasAccount && item.account?.role === "admin" && <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Admin</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{item.branch.name} · {item.profile.email} · {hasAccount ? `último login há ${idleDays ?? 0} dias` : "aguardando primeiro login"}</p></div><div className="grid grid-cols-3 items-center gap-3 xl:flex"><Select value={item.profile.operatorType} onValueChange={value => changeUser(item.profile.id, { operatorType: value as "leader" | "assistant" })}><SelectTrigger className="h-9 w-full text-xs xl:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="leader">Líder</SelectItem><SelectItem value="assistant">Auxiliar</SelectItem></SelectContent></Select><div className="flex items-center gap-2 text-xs font-bold"><Switch checked={item.profile.isActive} onCheckedChange={checked => changeUser(item.profile.id, { isActive: checked })} /><span className="hidden xl:inline">Acesso</span></div><div className="flex items-center gap-2 text-xs font-bold"><Switch checked={item.profile.isOnVacation} onCheckedChange={checked => changeUser(item.profile.id, { isOnVacation: checked })} /><span className="hidden xl:inline">Férias</span></div>{item.profile.userId && <Button size="sm" variant="outline" className="h-9 rounded-lg text-xs" onClick={() => changeRole(item.profile.userId!, item.account?.role === "admin" ? "user" : "admin")}>{item.account?.role === "admin" ? "Remover admin" : "Promover"}</Button>}</div></div>; })}</div></CardContent></Card></TabsContent>
      <TabsContent value="branches" className="mt-5"><Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="text-lg">Filiais</CardTitle><CardDescription>Cadastre manualmente ou importe uma planilha com ID, Regional e Filial.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{branches.map(branch => <BranchCard key={branch.id} branch={branch} onComplete={refresh} />)}{branches.length === 0 && <EmptyState text="Cadastre ou importe sua primeira filial para começar." />}</CardContent></Card></TabsContent>
      <TabsContent value="subscriptions" className="mt-5"><SubscriptionAdminPanel users={users} onChanged={refresh} /></TabsContent>
      <TabsContent value="texts" className="mt-5"><AppTextSettingsPanel /></TabsContent>
      <TabsContent value="alerts" className="mt-5"><div className="grid gap-5 lg:grid-cols-2"><AlertPanel title="Usuários inativos" description={`Sem login há ${INACTIVITY_DAYS} ou mais dias, ou ainda sem primeiro acesso.`} items={inactive.map(item => item.profile.fullName)} icon={Activity} /><AlertPanel title="Usuários em férias" description="Marcados pelo operador ou pela administração." items={vacation.map(item => item.profile.fullName)} icon={CalendarOff} /></div></TabsContent>
    </Tabs>
  </section>;
}

export function ManagementOverview({ rows, isLoading }: { rows: BranchOverview[]; isLoading: boolean }) {
  if (isLoading) return <Card className="mt-5 rounded-[1.7rem] border-border/70 shadow-sm"><CardContent className="p-5"><div className="h-5 w-52 animate-pulse rounded bg-muted" /><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="h-20 animate-pulse rounded-2xl bg-muted" /><div className="h-20 animate-pulse rounded-2xl bg-muted" /><div className="h-20 animate-pulse rounded-2xl bg-muted" /></div></CardContent></Card>;
  const operationalRows = rows.filter(row => row.metrics.monthOpening > 0 || row.metrics.currentOverdue > 0 || row.metrics.portfolioTotal > 0);
  const insights = operationalRows.map(row => {
    const elapsed = Math.max(1, row.metrics.workingDaysElapsed);
    const remaining = Math.max(row.metrics.workingDaysTotal - row.metrics.workingDaysElapsed, 0);
    const received = Math.max(row.metrics.monthOpening - row.metrics.currentOverdue, 0);
    const projectedReceived = received + (received / elapsed) * remaining;
    return { row, risk: collectionProjectionRisk({ monthOpening: row.metrics.monthOpening, projectedReceived, creditGoal: row.metrics.creditGoal }), projectedReceived };
  });
  const critical = insights.filter(item => item.risk.status === "critical");
  const projectedTotal = insights.reduce((total, item) => total + item.projectedReceived, 0);
  const averageDelinquency = operationalRows.length ? operationalRows.reduce((total, row) => total + (row.metrics.portfolioTotal > 0 ? (row.metrics.currentOverdue / row.metrics.portfolioTotal) * 100 : 0), 0) / operationalRows.length : 0;
  const regional = Array.from(operationalRows.reduce((groups, row) => {
    const key = row.branch.regional || "Sem regional";
    const values = groups.get(key) ?? { delinquency: 0, count: 0 };
    values.delinquency += row.metrics.portfolioTotal > 0 ? (row.metrics.currentOverdue / row.metrics.portfolioTotal) * 100 : 0;
    values.count += 1;
    groups.set(key, values);
    return groups;
  }, new Map<string, { delinquency: number; count: number }>())).map(([name, value]) => ({ name, average: value.delinquency / value.count, count: value.count })).sort((a, b) => b.average - a.average).slice(0, 4);
  return <Card className="mt-5 overflow-hidden rounded-[1.7rem] border-primary/20 shadow-sm"><CardContent className="p-0"><div className="flex flex-col justify-between gap-3 border-b border-border/70 bg-primary/5 p-5 sm:flex-row sm:items-center"><div><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-primary">Painel gerencial</p><h2 className="mt-1 text-xl font-black">Risco e projeção da operação</h2><p className="mt-1 text-xs text-muted-foreground">Visão consolidada baseada nas metas e no ritmo atual de cada filial.</p></div><span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">{operationalRows.length} filiais com dados</span></div><div className="grid gap-4 p-5 lg:grid-cols-[.8fr_.8fr_1.4fr]"><ManagementMetric label="Filiais críticas" value={String(critical.length)} note="Projeção acima da Meta Fiado" tone={critical.length ? "rose" : "emerald"} /><ManagementMetric label="Inadimplência média" value={`${averageDelinquency.toFixed(2)}%`} note="Média das filiais com carteira" tone={averageDelinquency >= 7 ? "rose" : "emerald"} /><ManagementMetric label="Projeção consolidada" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(projectedTotal)} note="Estimativa de recebimento até o fim do mês" tone="primary" /></div><div className="grid gap-4 border-t border-border/70 p-5 lg:grid-cols-2"><div><p className="text-xs font-black">Filiais que exigem atenção</p><div className="mt-3 space-y-2">{critical.length ? critical.slice(0, 4).map(item => <div key={item.row.branch.id} className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2"><span className="truncate text-sm font-bold">{item.row.branch.name}</span><span className="shrink-0 text-xs font-black text-rose-700 dark:text-rose-300">Reforço {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.risk.amountToRecover)}</span></div>) : <p className="rounded-xl bg-emerald-500/10 px-3 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-200">Nenhuma filial apresenta risco crítico com os dados atuais.</p>}</div></div><div><p className="text-xs font-black">Média por regional</p><div className="mt-3 space-y-2">{regional.length ? regional.map(item => <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2"><span className="truncate text-sm font-bold">{item.name}</span><span className="shrink-0 text-xs font-black text-primary">{item.average.toFixed(2)}% · {item.count} filial{item.count === 1 ? "" : "is"}</span></div>) : <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">Aguardando métricas das filiais.</p>}</div></div></div></CardContent></Card>;
}

function ManagementMetric({ label, value, note, tone }: { label: string; value: string; note: string; tone: "rose" | "emerald" | "primary" }) { const colors = tone === "rose" ? "border-rose-500/20 bg-rose-500/5" : tone === "emerald" ? "border-emerald-500/20 bg-emerald-500/5" : "border-primary/20 bg-primary/5"; return <div className={`rounded-2xl border p-4 ${colors}`}><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground">{label}</p><p className="mt-1 text-xl font-black tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>; }

function SpreadsheetImportDialog({ kind, onComplete }: { kind: "branches" | "analytics"; onComplete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const utils = trpc.useUtils();
  const importBranches = trpc.admin.importBranches.useMutation();
  const importAnalytics = trpc.admin.importAnalytics.useMutation();
  const isBranches = kind === "branches";
  const importStatusQuery = trpc.admin.importStatus.useQuery(undefined, { enabled: !isBranches });
  const title = isBranches ? "Importar filiais" : "Importar Matriz do Analítico";
  const columns = isBranches ? "A: ID · B: Regional · C: Filial" : "A: Filial · C: Região · G: Meta Fiado · H: Meta Desafio · I: Vencido Atual · R: Perdas do mês · S: % Perdas Venda · T: Meta Rec. Perdas · U: Recuperação Perdas";
  const loading = importBranches.isPending || importAnalytics.isPending;
  const isValidRow = (row: SpreadsheetRow) => Boolean(isBranches ? branchRowFromSpreadsheet(row) : analyticRowFromSpreadsheet(row));
  const validRows = rows.filter(isValidRow).length;
  const invalidRows = rows.length - validRows;
  const parsedCodes = rows.map(row => isBranches ? branchRowFromSpreadsheet(row)?.code : analyticRowFromSpreadsheet(row)?.code).filter((code): code is string => Boolean(code));
  const duplicateRows = parsedCodes.length - new Set(parsedCodes).size;
  const readyRows = validRows - duplicateRows;

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: null, raw: true });
      const data = parsed.slice(1).map(row => row.map(cell => typeof cell === "number" || typeof cell === "string" ? cell : cell == null ? null : String(cell)));
      setRows(data);
      setFileName(file.name);
      toast.success(`${data.length} linhas lidas da planilha.`);
    } catch { setRows([]); setFileName(""); toast.error("Não foi possível ler esta planilha. Use um arquivo Excel válido."); }
  }
  async function confirmImport() {
    if (!rows.length) return;
    try {
      if (isBranches) {
        const result = await importBranches.mutateAsync({ rows });
        toast.success(`${result.created} filiais criadas, ${result.updated} atualizadas e ${result.skipped} repetidas ignoradas.`);
      } else {
        const result = await importAnalytics.mutateAsync({ rows });
        toast.success(`${result.imported} filiais atualizadas na Matriz, ${result.unmatched} sem filial e ${result.skipped} repetidas ignoradas.`);
      }
      await onComplete();
      await utils.admin.importStatus.invalidate();
      await utils.matrix.overview.invalidate();
      setOpen(false); setRows([]); setFileName("");
    } catch { toast.error("A importação não pôde ser concluída. Revise as colunas e tente novamente."); }
  }
  const lastImport = importStatusQuery.data?.lastImportedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(importStatusQuery.data.lastImportedAt)) : "Nenhum envio Analítico registrado";
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="rounded-xl font-bold"><FileSpreadsheet className="mr-2 h-4 w-4" />{isBranches ? "Importar filiais" : "Importar Matriz"}</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>O arquivo é lido no navegador e enviado somente após sua confirmação. Colunas esperadas: {columns}.</DialogDescription></DialogHeader><div className="space-y-5">{!isBranches && <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4"><p className="text-xs font-black text-primary">Atualização recorrente da Matriz</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Último envio: <strong className="text-foreground">{lastImport}</strong>. Mantenha o mesmo padrão de colunas, envie a planilha atualizada e confirme a prévia abaixo; os dados serão atualizados somente na guia Matriz, sem alterar as metas e lançamentos dos operadores.</p></div>}<div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5"><Label htmlFor={`spreadsheet-${kind}`} className="flex cursor-pointer flex-col items-center gap-2 text-center"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"><UploadCloud className="h-5 w-5" /></span><span className="font-bold">Selecionar planilha Excel</span><span className="text-xs font-normal text-muted-foreground">Arquivos .xlsx, .xls ou .csv</span></Label><Input id={`spreadsheet-${kind}`} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={loadFile} /></div>{fileName && <div className="rounded-xl border border-border/70 bg-muted/40 p-4"><p className="flex items-center gap-2 text-sm font-extrabold"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{fileName}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><ImportCount label="Lidas" value={rows.length} /><ImportCount label="Válidas" value={validRows} tone="text-emerald-600" /><ImportCount label="Incompletas" value={invalidRows} tone={invalidRows ? "text-destructive" : undefined} /><ImportCount label="Duplicadas" value={duplicateRows} tone={duplicateRows ? "text-amber-600" : undefined} /></div><p className="mt-3 text-xs font-bold text-primary">{readyRows} linha{readyRows === 1 ? "" : "s"} será{readyRows === 1 ? "" : "ão"} enviada{readyRows === 1 ? "" : "s"} para processamento.</p></div>}{rows.length > 0 && <div className="overflow-hidden rounded-xl border border-border/70"><div className="border-b border-border/70 bg-muted/40 px-4 py-3 text-xs font-extrabold">Prévia e validação das primeiras linhas</div><div className="max-h-44 overflow-auto"><table className="w-full text-left text-xs"><tbody>{rows.slice(0, 5).map((row, index) => <tr key={index} className="border-b border-border/50 last:border-0"><td className="w-10 px-3 py-2 font-bold text-muted-foreground">{index + 2}</td><td className="px-3 py-2 text-muted-foreground">{row.filter(value => value !== null && value !== "").slice(0, 6).join(" · ") || "Linha vazia"}</td><td className="px-3 py-2 text-right font-bold"><span className={isValidRow(row) ? "text-emerald-600" : "text-destructive"}>{isValidRow(row) ? "Válida" : "Incompleta"}</span></td></tr>)}</tbody></table></div></div>}<Button className="w-full rounded-xl" disabled={!readyRows || loading} onClick={confirmImport}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}Confirmar importação de {readyRows} linha{readyRows === 1 ? "" : "s"}</Button></div></DialogContent></Dialog>;
}

function ImportCount({ label, value, tone }: { label: string; value: number; tone?: string }) { return <div className="rounded-lg bg-background px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-0.5 text-base font-black ${tone || "text-foreground"}`}>{value}</p></div>; }

function CredentialsDialog() { const change = trpc.adminAuth.updateCredentials.useMutation(); const [username, setUsername] = useState("admin"); const [newPassword, setNewPassword] = useState(""); async function submit(event: FormEvent) { event.preventDefault(); try { await change.mutateAsync({ username, newPassword: newPassword || undefined }); setNewPassword(""); toast.success("Credenciais administrativas atualizadas."); } catch { toast.error("Não foi possível atualizar as credenciais."); } } return <Dialog><DialogTrigger asChild><Button variant="outline" className="rounded-xl font-bold"><KeyRound className="mr-2 h-4 w-4" />Credenciais</Button></DialogTrigger><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Credenciais administrativas</DialogTitle><DialogDescription>Altere o usuário e, se desejar, defina uma nova senha de pelo menos 8 caracteres.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label>Usuário</Label><Input value={username} onChange={event => setUsername(event.target.value)} required /></div><div className="space-y-2"><Label>Nova senha <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input type="password" minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="Deixe em branco para manter" /></div><Button className="w-full" disabled={change.isPending}>{change.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar credenciais</Button></form></DialogContent></Dialog>; }
function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: "primary" | "amber" | "violet" }) { const style = tone === "amber" ? "bg-amber-500/10 text-amber-600" : tone === "violet" ? "bg-violet-500/10 text-violet-600" : "bg-primary/10 text-primary"; return <Card className="rounded-2xl border-border/70 shadow-sm"><CardContent className="flex items-center gap-4 p-4"><span className={`grid h-10 w-10 place-items-center rounded-xl ${style}`}><Icon className="h-4 w-4" /></span><div><p className="text-2xl font-black tracking-tight">{value}</p><p className="text-[11px] font-semibold text-muted-foreground">{label}</p></div></CardContent></Card>; }
function BranchCard({ branch, onComplete }: { branch: Branch; onComplete: () => Promise<void> }) { const status = trpc.admin.setBranchStatus.useMutation(); async function toggle(value: boolean) { try { await status.mutateAsync({ id: branch.id, isActive: value }); await onComplete(); toast.success("Status da filial atualizado."); } catch { toast.error("Não foi possível atualizar a filial."); } } return <div className="rounded-2xl border border-border/70 bg-muted/30 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold">{branch.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{branch.code || "Sem código"}{branch.regional ? ` · ${branch.regional}` : ""}</p></div><Switch checked={branch.isActive} onCheckedChange={toggle} /></div><p className="mt-5 text-[11px] font-bold text-muted-foreground">{branch.isActive ? "Disponível para cadastros" : "Indisponível para novos cadastros"}</p></div>; }
function BranchDialog({ onComplete }: { onComplete: () => Promise<void> }) { const create = trpc.admin.createBranch.useMutation(); const [name, setName] = useState(""); const [code, setCode] = useState(""); async function submit(event: FormEvent) { event.preventDefault(); try { await create.mutateAsync({ name, code: code || undefined }); await onComplete(); setName(""); setCode(""); toast.success("Filial cadastrada."); } catch { toast.error("Não foi possível cadastrar a filial."); } } return <Dialog><DialogTrigger asChild><Button variant="outline" className="rounded-xl font-bold"><Building2 className="mr-2 h-4 w-4" />Nova filial</Button></DialogTrigger><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Cadastrar filial</DialogTitle><DialogDescription>A filial ficará disponível para o cadastro de operadores.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label>Nome da filial</Label><Input required value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Filial Centro" /></div><div className="space-y-2"><Label>Código <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input value={code} onChange={event => setCode(event.target.value)} placeholder="Ex.: 1002" /></div><Button className="w-full" disabled={create.isPending}>{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar filial</Button></form></DialogContent></Dialog>; }
function UserDialog({ branches, onComplete }: { branches: { id: number; name: string }[]; onComplete: () => Promise<void> }) {
  const create = trpc.admin.preRegister.useMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", instagram: "", branchId: "", operatorType: "leader" as "leader" | "assistant" });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.branchId) return toast.error("Selecione uma filial.");
    try {
      await create.mutateAsync({ ...form, branchId: Number(form.branchId), instagram: form.instagram || null });
      await onComplete();
      setOpen(false);
      setForm({ fullName: "", email: "", phone: "", instagram: "", branchId: "", operatorType: "leader" });
      toast.success("Operador cadastrado para acesso pelo Google.");
    } catch { toast.error("Não foi possível cadastrar o operador."); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="rounded-xl font-bold"><UserPlus className="mr-2 h-4 w-4" />Cadastrar operador</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>Cadastrar operador</DialogTitle><DialogDescription>O operador acessará diretamente pelo Google usando este e-mail. Não é necessário definir nem compartilhar senha.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label>Nome</Label><Input required value={form.fullName} onChange={event => setForm(current => ({ ...current, fullName: event.target.value }))} /></div><div className="space-y-2"><Label>E-mail autorizado no Google</Label><Input required type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /><p className="text-[11px] leading-relaxed text-muted-foreground">O e-mail deve ser exatamente o mesmo usado na conta Google do operador.</p></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>WhatsApp</Label><Input required value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} /></div><div className="space-y-2"><Label>Instagram</Label><Input value={form.instagram} onChange={event => setForm(current => ({ ...current, instagram: event.target.value }))} /></div></div><div className="space-y-2"><Label>Filial</Label><Select value={form.branchId} onValueChange={value => setForm(current => ({ ...current, branchId: value }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{branches.map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Função</Label><Select value={form.operatorType} onValueChange={value => setForm(current => ({ ...current, operatorType: value as "leader" | "assistant" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="leader">Operador Líder</SelectItem><SelectItem value="assistant">Operador Auxiliar</SelectItem></SelectContent></Select></div><Button className="w-full" disabled={create.isPending || !branches.length}>{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Autorizar acesso com Google</Button></form></DialogContent></Dialog>;
}
function AlertPanel({ title, description, items, icon: Icon }: { title: string; description: string; items: string[]; icon: typeof Activity }) { return <Card className="rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{items.length ? <div className="space-y-2">{items.map(item => <div key={item} className="rounded-xl bg-muted/50 px-3 py-2 text-xs font-bold">{item}</div>)}</div> : <p className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">Nenhum usuário nesta situação.</p>}</CardContent></Card>; }
function EmptyState({ text }: { text: string }) { return <p className="col-span-full p-7 text-center text-sm text-muted-foreground">{text}</p>; }
function AdminLoading() { return <section className="mx-auto max-w-7xl animate-pulse"><div className="h-10 w-72 rounded-xl bg-muted" /><div className="mt-8 grid gap-4 sm:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-24 rounded-2xl bg-muted" />)}</div><div className="mt-7 h-80 rounded-[1.6rem] bg-muted" /></section>; }
function AdminError({ onRetry }: { onRetry: () => void }) { return <section className="mx-auto grid min-h-[52vh] max-w-2xl place-items-center"><Card className="w-full rounded-[1.6rem] border-border/70 p-8 text-center shadow-sm"><CardHeader className="p-0"><CardTitle className="text-xl">Não foi possível carregar a administração</CardTitle><CardDescription className="mt-2">A conexão com os dados administrativos falhou. Tente novamente; se o problema continuar, recarregue a página.</CardDescription></CardHeader><CardContent className="pt-6"><Button onClick={onRetry} className="rounded-xl font-bold">Tentar novamente</Button></CardContent></Card></section>; }
