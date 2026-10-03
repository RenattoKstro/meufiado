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
import {
  analyticRowFromSpreadsheet,
  branchRowFromSpreadsheet,
  challengeDailyRowFromSpreadsheet,
  dailyTrackingRowFromSpreadsheet,
  dataRowFromSpreadsheet,
  receiptDailyRowFromSpreadsheet,
} from "../../../shared/importRules";
import AdminContactActions from "@/components/AdminContactActions";
import SubscriptionAdminPanel from "@/components/SubscriptionAdminPanel";
import AppTextSettingsPanel from "@/components/AppTextSettingsPanel";
import UpdateNotesAdminPanel from "@/components/UpdateNotesAdminPanel";
import MaintenanceSettingsPanel from "@/components/MaintenanceSettingsPanel";

const INACTIVITY_DAYS = 7;
type SpreadsheetRow = (string | number | null)[];
type MatrixSheetKey = "analytic" | "data" | "dailyTracking" | "challengeDaily" | "receiptDaily";
type MatrixSheets = Record<MatrixSheetKey, SpreadsheetRow[]>;
const EMPTY_MATRIX_SHEETS: MatrixSheets = { analytic: [], data: [], dailyTracking: [], challengeDaily: [], receiptDaily: [] };
const MATRIX_SHEET_DETAILS: Record<MatrixSheetKey, { title: string; acceptedNames: string; columns: string }> = {
  analytic: { title: "Analítico", acceptedNames: "Analítico", columns: "A Filial · C Regional · G–L Fiado/Desafio · N–P Ticket · R–V Perdas" },
  data: { title: "Dados", acceptedNames: "Dados", columns: "B Filial · E Regional · K–M carteira · O–Q previsão · V–X recuperação" },
  dailyTracking: { title: "Acomp.Meta Diaria", acceptedNames: "Acomp.Meta Diaria", columns: "A Filial · D–H acompanhamento diário" },
  challengeDaily: { title: "Meta Desafio Diária", acceptedNames: "Meta Desafio Diária", columns: "A Filial · B Regional · C–AG recebidos diários" },
  receiptDaily: { title: "Vencido_Dia", acceptedNames: "Vencido_Dia", columns: "B Filial · C Vendas · H, O, V… recebimento diário" },
};
function normalizeSheetName(name: string) { return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, ""); }
function identifyMatrixSheet(name: string): MatrixSheetKey | null {
  const normalized = normalizeSheetName(name);
  if (normalized.includes("acompmetadiaria")) return "dailyTracking";
  if (normalized.includes("metadesafiodiaria") || normalized.includes("precebidodiario")) return "challengeDaily";
  if (normalized.includes("vencidodia") || normalized.includes("recebimentodiario")) return "receiptDaily";
  if (normalized === "dados" || normalized.startsWith("dados")) return "data";
  if (normalized.includes("analit")) return "analytic";
  return null;
}
type Branch = { id: number; name: string; code: string | null; regional: string | null; isActive: boolean };

export default function Admin() {
  const usersQuery = trpc.admin.users.useQuery();
  const branchesQuery = trpc.admin.branches.useQuery();
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
    <Tabs defaultValue="users" className="mt-0 min-w-0">
      <header className="mb-6 flex min-w-0 flex-col gap-4 rounded-[1.6rem] border border-border/70 bg-card p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Gestão da operação</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Painel administrativo</h1><p className="mt-2 text-sm text-muted-foreground">Gerencie usuários, filiais, metas e importações da operação.</p></div>
        <div className="flex min-w-0 flex-col gap-3 lg:items-end"><div className="flex w-full min-w-0 flex-wrap gap-2 lg:justify-end"><CredentialsDialog /><SpreadsheetImportDialog kind="branches" onComplete={refresh} /><SpreadsheetImportDialog kind="analytics" onComplete={refresh} /><BranchDialog onComplete={refresh} /><UserDialog branches={branches} onComplete={refresh} /></div><TabsList className="h-auto w-full max-w-full flex-wrap justify-start gap-1 rounded-xl bg-muted p-1 lg:justify-end"><TabsTrigger value="users" className="rounded-lg px-3 py-2 text-xs font-bold">Usuários</TabsTrigger><TabsTrigger value="contacts" className="rounded-lg px-3 py-2 text-xs font-bold">Perfis e contatos</TabsTrigger><TabsTrigger value="branches" className="rounded-lg px-3 py-2 text-xs font-bold">Filiais</TabsTrigger><TabsTrigger value="subscriptions" className="rounded-lg px-3 py-2 text-xs font-bold">Assinaturas</TabsTrigger><TabsTrigger value="updates" className="rounded-lg px-3 py-2 text-xs font-bold">Atualizações</TabsTrigger><TabsTrigger value="texts" className="rounded-lg px-3 py-2 text-xs font-bold">Textos</TabsTrigger><TabsTrigger value="maintenance" className="rounded-lg px-3 py-2 text-xs font-bold">Manutenção</TabsTrigger><TabsTrigger value="alerts" className="rounded-lg px-3 py-2 text-xs font-bold">Atenções</TabsTrigger></TabsList></div>
      </header>
    <div className="grid gap-4 sm:grid-cols-3"><Stat icon={Users} label="Usuários ativos" value={active.length} tone="primary" /><Stat icon={CalendarOff} label="Em férias" value={vacation.length} tone="amber" /><Stat icon={Activity} label={`Inativos há ${INACTIVITY_DAYS}+ dias`} value={inactive.length} tone="violet" /></div>
      <TabsContent value="users" className="mt-5"><Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader className="border-b border-border/70"><CardTitle className="text-lg">Operadores cadastrados</CardTitle><CardDescription>Ative ou desative acessos, altere a função e conceda perfil administrativo.</CardDescription></CardHeader><CardContent className="p-0"><div className="divide-y divide-border/70">{users.length === 0 ? <EmptyState text="Ainda não há operadores cadastrados." /> : users.map(item => { const hasAccount = Boolean(item.account); const idleDays = item.account?.lastSignedIn ? Math.floor((now - new Date(item.account.lastSignedIn).getTime()) / 86400000) : undefined; return <div key={item.profile.id} className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-extrabold">{item.profile.fullName}</p>{!item.profile.isActive && <Badge variant="secondary" className="rounded-full bg-destructive/10 text-destructive">Inativo</Badge>}{item.profile.isOnVacation && <Badge variant="secondary" className="rounded-full bg-amber-500/10 text-amber-600">Férias</Badge>}{hasAccount && item.account?.role === "admin" && <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Admin</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{item.branch.name} · {item.profile.email} · {hasAccount ? `último login há ${idleDays ?? 0} dias` : "aguardando primeiro login"}</p></div><div className="grid grid-cols-3 items-center gap-3 xl:flex"><Select value={item.profile.operatorType} onValueChange={value => changeUser(item.profile.id, { operatorType: value as "leader" | "assistant" })}><SelectTrigger className="h-9 w-full text-xs xl:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="leader">Líder</SelectItem><SelectItem value="assistant">Auxiliar</SelectItem></SelectContent></Select><div className="flex items-center gap-2 text-xs font-bold"><Switch checked={item.profile.isActive} onCheckedChange={checked => changeUser(item.profile.id, { isActive: checked })} /><span className="hidden xl:inline">Acesso</span></div><div className="flex items-center gap-2 text-xs font-bold"><Switch checked={item.profile.isOnVacation} onCheckedChange={checked => changeUser(item.profile.id, { isOnVacation: checked })} /><span className="hidden xl:inline">Férias</span></div>{item.profile.userId && <Button size="sm" variant="outline" className="h-9 rounded-lg text-xs" onClick={() => changeRole(item.profile.userId!, item.account?.role === "admin" ? "user" : "admin")}>{item.account?.role === "admin" ? "Remover admin" : "Promover"}</Button>}</div></div>; })}</div></CardContent></Card></TabsContent>
      <TabsContent value="contacts" className="mt-5"><AdminContactActions users={users} onChanged={refresh} /></TabsContent>
      <TabsContent value="branches" className="mt-5"><Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="text-lg">Filiais</CardTitle><CardDescription>Cadastre manualmente ou importe uma planilha com ID, Regional e Filial.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{branches.map(branch => <BranchCard key={branch.id} branch={branch} onComplete={refresh} />)}{branches.length === 0 && <EmptyState text="Cadastre ou importe sua primeira filial para começar." />}</CardContent></Card></TabsContent>
      <TabsContent value="subscriptions" className="mt-5"><SubscriptionAdminPanel users={users} onChanged={refresh} /></TabsContent>
      <TabsContent value="updates" className="mt-5"><UpdateNotesAdminPanel /></TabsContent>
      <TabsContent value="texts" className="mt-5"><AppTextSettingsPanel /></TabsContent>
      <TabsContent value="maintenance" className="mt-5"><MaintenanceSettingsPanel /></TabsContent>
      <TabsContent value="alerts" className="mt-5"><div className="grid gap-5 lg:grid-cols-2"><AlertPanel title="Usuários inativos" description={`Sem login há ${INACTIVITY_DAYS} ou mais dias, ou ainda sem primeiro acesso.`} items={inactive.map(item => item.profile.fullName)} icon={Activity} /><AlertPanel title="Usuários em férias" description="Marcados pelo operador ou pela administração." items={vacation.map(item => item.profile.fullName)} icon={CalendarOff} /></div></TabsContent>
    </Tabs>
  </section>;
}

/** Compatibilidade de importação: o painel gerencial foi removido da interface. */
export function ManagementOverview(_props: { rows?: unknown[]; isLoading?: boolean }) { return null; }
function SpreadsheetImportDialog({ kind, onComplete }: { kind: "branches" | "analytics"; onComplete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const [matrixSheets, setMatrixSheets] = useState<MatrixSheets>(EMPTY_MATRIX_SHEETS);
  const utils = trpc.useUtils();
  const importBranches = trpc.admin.importBranches.useMutation();
  const importAnalytics = trpc.admin.importAnalytics.useMutation();
  const isBranches = kind === "branches";
  const importStatusQuery = trpc.admin.importStatus.useQuery(undefined, { enabled: !isBranches });
  const title = isBranches ? "Importar filiais" : "Importar Matriz consolidada";
  const columns = isBranches ? "A: ID · B: Regional · C: Filial" : "O arquivo deve conter as abas Analítico, Dados, Acomp.Meta Diaria, Meta Desafio Diária e Vencido_Dia.";
  const loading = importBranches.isPending || importAnalytics.isPending;
  const matrixParsers = { analytic: analyticRowFromSpreadsheet, data: dataRowFromSpreadsheet, dailyTracking: dailyTrackingRowFromSpreadsheet, challengeDaily: challengeDailyRowFromSpreadsheet, receiptDaily: receiptDailyRowFromSpreadsheet } as const;
  const isValidRow = (row: SpreadsheetRow) => Boolean(branchRowFromSpreadsheet(row));
  const validRows = isBranches ? rows.filter(isValidRow).length : (Object.keys(matrixSheets) as MatrixSheetKey[]).reduce((total, key) => total + matrixSheets[key].filter(row => matrixParsers[key](row)).length, 0);
  const totalRows = isBranches ? rows.length : (Object.keys(matrixSheets) as MatrixSheetKey[]).reduce((total, key) => total + matrixSheets[key].length, 0);
  const invalidRows = totalRows - validRows;
  const parsedCodes = rows.map(row => isBranches ? branchRowFromSpreadsheet(row)?.code : analyticRowFromSpreadsheet(row)?.code).filter((code): code is string => Boolean(code));
  const duplicateRows = parsedCodes.length - new Set(parsedCodes).size;
  const hasRequiredMatrixSheets = (Object.keys(matrixSheets) as MatrixSheetKey[]).every(key => matrixSheets[key].length > 0);
  const readyRows = isBranches ? validRows - duplicateRows : validRows;

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const parseSheet = (sheet: XLSX.WorkSheet) => XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true }).slice(1).map(row => row.map(cell => typeof cell === "number" || typeof cell === "string" ? cell : cell == null ? null : String(cell)));
      if (isBranches) {
        setRows(parseSheet(workbook.Sheets[workbook.SheetNames[0]]));
      } else {
        const nextSheets: MatrixSheets = { ...EMPTY_MATRIX_SHEETS };
        workbook.SheetNames.forEach(name => {
          const key = identifyMatrixSheet(name);
          if (key) nextSheets[key] = parseSheet(workbook.Sheets[name]);
        });
        setMatrixSheets(nextSheets);
        const found = (Object.keys(nextSheets) as MatrixSheetKey[]).filter(key => nextSheets[key].length > 0);
        if (found.length !== 5) toast.warning(`Foram encontradas ${found.length} das 5 abas obrigatórias. Revise os nomes das abas antes de importar.`);
      }
      setFileName(file.name);
      toast.success(`${isBranches ? "Filiais" : "Abas da Matriz"} lidas do arquivo.`);
    } catch { setRows([]); setMatrixSheets(EMPTY_MATRIX_SHEETS); setFileName(""); toast.error("Não foi possível ler este arquivo. Use um Excel válido."); }
  }
  async function confirmImport() {
    if (isBranches ? !rows.length : !hasRequiredMatrixSheets) return;
    try {
      if (isBranches) {
        const result = await importBranches.mutateAsync({ rows });
        toast.success(`${result.created} filiais criadas, ${result.updated} atualizadas e ${result.skipped} repetidas ignoradas.`);
      } else {
        const result = await importAnalytics.mutateAsync(matrixSheets);
        toast.success(`${result.imported} filiais atualizadas${result.createdBranches ? `, ${result.createdBranches} filiais criadas` : ""}${result.unmatched ? ` e ${result.unmatched} códigos sem referência no Analítico` : ""}.`);
      }
      await onComplete();
      await utils.admin.importStatus.invalidate();
      await utils.matrix.overview.invalidate();
      await utils.matrix.importStatus.invalidate();
      setOpen(false); setRows([]); setMatrixSheets(EMPTY_MATRIX_SHEETS); setFileName("");
    } catch { toast.error("A importação não pôde ser concluída. Revise as colunas e tente novamente."); }
  }
  const lastImport = importStatusQuery.data?.lastImportedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(importStatusQuery.data.lastImportedAt)) : "Nenhuma importação da Matriz registrada";
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="rounded-xl font-bold"><FileSpreadsheet className="mr-2 h-4 w-4" />{isBranches ? "Importar filiais" : "Importar Matriz"}</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>O arquivo é lido no navegador e enviado somente após sua confirmação. {columns}</DialogDescription></DialogHeader><div className="space-y-5">{!isBranches && <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4"><p className="text-xs font-black text-primary">Atualização recorrente da Matriz</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Último envio: <strong className="text-foreground">{lastImport}</strong>. A aba <strong>Analítico</strong> define a Filial e a Regional de referência; as demais abas são associadas somente pelo código da Filial. A importação atualiza apenas a Matriz e não altera metas ou lançamentos dos operadores.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{(Object.keys(MATRIX_SHEET_DETAILS) as MatrixSheetKey[]).map(key => <div key={key} className={`rounded-xl border px-3 py-2 text-xs ${matrixSheets[key].length ? "border-emerald-500/25 bg-emerald-500/5" : "border-border/70 bg-background/50"}`}><p className="font-extrabold">{MATRIX_SHEET_DETAILS[key].title}</p><p className="mt-0.5 text-muted-foreground">{MATRIX_SHEET_DETAILS[key].columns}</p></div>)}</div></div>}<div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5"><Label htmlFor={`spreadsheet-${kind}`} className="flex cursor-pointer flex-col items-center gap-2 text-center"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"><UploadCloud className="h-5 w-5" /></span><span className="font-bold">Selecionar arquivo Excel</span><span className="text-xs font-normal text-muted-foreground">{isBranches ? "Arquivos .xlsx, .xls ou .csv" : "Um arquivo .xlsx com as cinco abas exigidas"}</span></Label><Input id={`spreadsheet-${kind}`} type="file" accept={isBranches ? ".xlsx,.xls,.csv" : ".xlsx,.xls"} className="sr-only" onChange={loadFile} /></div>{fileName && <div className="rounded-xl border border-border/70 bg-muted/40 p-4"><p className="flex items-center gap-2 text-sm font-extrabold"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{fileName}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><ImportCount label="Lidas" value={totalRows} /><ImportCount label="Válidas" value={validRows} tone="text-emerald-600" /><ImportCount label="Incompletas" value={invalidRows} tone={invalidRows ? "text-destructive" : undefined} /><ImportCount label="Duplicadas" value={isBranches ? duplicateRows : 0} tone={isBranches && duplicateRows ? "text-amber-600" : undefined} /></div>{!isBranches && <p className={`mt-3 text-xs font-bold ${hasRequiredMatrixSheets ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}>{hasRequiredMatrixSheets ? "As cinco abas foram localizadas e podem ser importadas." : "Falta ao menos uma aba obrigatória. Revise os nomes informados acima."}</p>}<p className="mt-2 text-xs font-bold text-primary">{readyRows} linha{readyRows === 1 ? "" : "s"} válida{readyRows === 1 ? "" : "s"} será{readyRows === 1 ? "" : "ão"} enviada{readyRows === 1 ? "" : "s"} para processamento.</p></div>}{isBranches && rows.length > 0 && <div className="overflow-hidden rounded-xl border border-border/70"><div className="border-b border-border/70 bg-muted/40 px-4 py-3 text-xs font-extrabold">Prévia e validação das primeiras linhas</div><div className="max-h-44 overflow-auto"><table className="w-full text-left text-xs"><tbody>{rows.slice(0, 5).map((row, index) => <tr key={index} className="border-b border-border/50 last:border-0"><td className="w-10 px-3 py-2 font-bold text-muted-foreground">{index + 2}</td><td className="px-3 py-2 text-muted-foreground">{row.filter(value => value !== null && value !== "").slice(0, 6).join(" · ") || "Linha vazia"}</td><td className="px-3 py-2 text-right font-bold"><span className={isValidRow(row) ? "text-emerald-600" : "text-destructive"}>{isValidRow(row) ? "Válida" : "Incompleta"}</span></td></tr>)}</tbody></table></div></div>}<Button className="w-full rounded-xl" disabled={!readyRows || (!isBranches && !hasRequiredMatrixSheets) || loading} onClick={confirmImport}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}Confirmar importação de {readyRows} linha{readyRows === 1 ? "" : "s"}</Button></div></DialogContent></Dialog>;
}

function ImportCount({ label, value, tone }: { label: string; value: number; tone?: string }) { return <div className="rounded-lg bg-background px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-0.5 text-base font-black ${tone || "text-foreground"}`}>{value}</p></div>; }

function CredentialsDialog() { const change = trpc.adminAuth.updateCredentials.useMutation(); const [username, setUsername] = useState("admin"); const [newPassword, setNewPassword] = useState(""); async function submit(event: FormEvent) { event.preventDefault(); try { await change.mutateAsync({ username, newPassword: newPassword || undefined }); setNewPassword(""); toast.success("Credenciais administrativas atualizadas."); } catch { toast.error("Não foi possível atualizar as credenciais."); } } return <Dialog><DialogTrigger asChild><Button variant="outline" className="rounded-xl font-bold"><KeyRound className="mr-2 h-4 w-4" />Credenciais</Button></DialogTrigger><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Credenciais administrativas</DialogTitle><DialogDescription>Altere o usuário e, se desejar, defina uma nova senha de pelo menos 8 caracteres.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label>Usuário</Label><Input value={username} onChange={event => setUsername(event.target.value)} required /></div><div className="space-y-2"><Label>Nova senha <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input type="password" minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="Deixe em branco para manter" /></div><Button className="w-full" disabled={change.isPending}>{change.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar credenciais</Button></form></DialogContent></Dialog>; }
function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: "primary" | "amber" | "violet" }) { const style = tone === "amber" ? "bg-amber-500/10 text-amber-600" : tone === "violet" ? "bg-violet-500/10 text-violet-600" : "bg-primary/10 text-primary"; return <Card className="rounded-2xl border-border/70 shadow-sm"><CardContent className="flex items-center gap-4 p-4"><span className={`grid h-10 w-10 place-items-center rounded-xl ${style}`}><Icon className="h-4 w-4" /></span><div><p className="text-2xl font-black tracking-tight">{value}</p><p className="text-[11px] font-semibold text-muted-foreground">{label}</p></div></CardContent></Card>; }
function BranchCard({ branch, onComplete }: { branch: Branch; onComplete: () => Promise<void> }) { const status = trpc.admin.setBranchStatus.useMutation(); async function toggle(value: boolean) { try { await status.mutateAsync({ id: branch.id, isActive: value }); await onComplete(); toast.success("Status da filial atualizado."); } catch { toast.error("Não foi possível atualizar a filial."); } } return <div className="rounded-2xl border border-border/70 bg-muted/30 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold">{branch.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{branch.code || "Sem código"}{branch.regional ? ` · ${branch.regional}` : ""}</p></div><Switch checked={branch.isActive} onCheckedChange={toggle} /></div><p className="mt-5 text-[11px] font-bold text-muted-foreground">{branch.isActive ? "Disponível para cadastros" : "Indisponível para novos cadastros"}</p></div>; }
function BranchDialog({ onComplete }: { onComplete: () => Promise<void> }) { const create = trpc.admin.createBranch.useMutation(); const [name, setName] = useState(""); const [code, setCode] = useState(""); async function submit(event: FormEvent) { event.preventDefault(); try { await create.mutateAsync({ name, code: code || undefined }); await onComplete(); setName(""); setCode(""); toast.success("Filial cadastrada."); } catch { toast.error("Não foi possível cadastrar a filial."); } } return <Dialog><DialogTrigger asChild><Button variant="outline" className="rounded-xl font-bold"><Building2 className="mr-2 h-4 w-4" />Nova filial</Button></DialogTrigger><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Cadastrar filial</DialogTitle><DialogDescription>A filial ficará disponível para o cadastro de operadores.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label>Nome da filial</Label><Input required value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Filial Centro" /></div><div className="space-y-2"><Label>Código <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input value={code} onChange={event => setCode(event.target.value)} placeholder="Ex.: 1002" /></div><Button className="w-full" disabled={create.isPending}>{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar filial</Button></form></DialogContent></Dialog>; }
function UserDialog({ branches, onComplete }: { branches: { id: number; name: string }[]; onComplete: () => Promise<void> }) {
  const createGoogle = trpc.admin.preRegister.useMutation();
  const createLocal = trpc.admin.createLocalUser.useMutation();
  const [open, setOpen] = useState(false);
  const [accessMode, setAccessMode] = useState<"google" | "local">("google");
  const [form, setForm] = useState({ fullName: "", email: "", username: "", password: "", phone: "", instagram: "", branchId: "", operatorType: "leader" as "leader" | "assistant" });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.branchId) return toast.error("Selecione uma filial.");
    try {
      if (accessMode === "local") {
        if (!form.username || !form.password) return toast.error("Informe o usuário e a senha do operador.");
        await createLocal.mutateAsync({ ...form, branchId: Number(form.branchId), instagram: form.instagram || null, email: form.email || undefined });
      } else {
        await createGoogle.mutateAsync({ fullName: form.fullName, email: form.email, phone: form.phone, instagram: form.instagram || null, branchId: Number(form.branchId), operatorType: form.operatorType });
      }
      await onComplete();
      setOpen(false);
      setForm({ fullName: "", email: "", username: "", password: "", phone: "", instagram: "", branchId: "", operatorType: "leader" });
      toast.success(accessMode === "local" ? "Usuário e senha criados com sucesso." : "Operador cadastrado para acesso pelo Google.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o operador."); }
  }
  const pending = createGoogle.isPending || createLocal.isPending;
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="rounded-xl font-bold"><UserPlus className="mr-2 h-4 w-4" />Cadastrar operador</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>Cadastrar operador</DialogTitle><DialogDescription>O administrador pode liberar acesso pelo Google ou criar um usuário e uma senha próprios.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}><div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1"><Button type="button" variant={accessMode === "google" ? "default" : "ghost"} className="rounded-lg" onClick={() => setAccessMode("google")}>Acesso Google</Button><Button type="button" variant={accessMode === "local" ? "default" : "ghost"} className="rounded-lg" onClick={() => setAccessMode("local")}>Usuário e senha</Button></div><div className="space-y-2"><Label>Nome</Label><Input required value={form.fullName} onChange={event => setForm(current => ({ ...current, fullName: event.target.value }))} /></div>{accessMode === "google" ? <div className="space-y-2"><Label>E-mail autorizado no Google</Label><Input required type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /><p className="text-[11px] text-muted-foreground">O e-mail deve ser o mesmo da conta Google do operador.</p></div> : <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Usuário</Label><Input required value={form.username} onChange={event => setForm(current => ({ ...current, username: event.target.value }))} placeholder="Ex.: Renato" /></div><div className="space-y-2"><Label>Senha inicial</Label><Input required type="password" minLength={6} value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} placeholder="Mínimo de 6 caracteres" /></div><div className="space-y-2 sm:col-span-2"><Label>E-mail <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="Opcional para contato" /></div></div>}<div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>WhatsApp</Label><Input required value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} /></div><div className="space-y-2"><Label>Instagram</Label><Input value={form.instagram} onChange={event => setForm(current => ({ ...current, instagram: event.target.value }))} /></div></div><div className="space-y-2"><Label>Filial</Label><Select value={form.branchId} onValueChange={value => setForm(current => ({ ...current, branchId: value }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{branches.map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Função</Label><Select value={form.operatorType} onValueChange={value => setForm(current => ({ ...current, operatorType: value as "leader" | "assistant" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="leader">Operador Líder</SelectItem><SelectItem value="assistant">Operador Auxiliar</SelectItem></SelectContent></Select></div><Button className="w-full" disabled={pending || !branches.length}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{accessMode === "local" ? "Criar usuário e senha" : "Autorizar acesso com Google"}</Button></form></DialogContent></Dialog>;
}
function AlertPanel({ title, description, items, icon: Icon }: { title: string; description: string; items: string[]; icon: typeof Activity }) { return <Card className="rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{items.length ? <div className="space-y-2">{items.map(item => <div key={item} className="rounded-xl bg-muted/50 px-3 py-2 text-xs font-bold">{item}</div>)}</div> : <p className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">Nenhum usuário nesta situação.</p>}</CardContent></Card>; }
function EmptyState({ text }: { text: string }) { return <p className="col-span-full p-7 text-center text-sm text-muted-foreground">{text}</p>; }
function AdminLoading() { return <section className="mx-auto max-w-7xl animate-pulse"><div className="h-10 w-72 rounded-xl bg-muted" /><div className="mt-8 grid gap-4 sm:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-24 rounded-2xl bg-muted" />)}</div><div className="mt-7 h-80 rounded-[1.6rem] bg-muted" /></section>; }
function AdminError({ onRetry }: { onRetry: () => void }) { return <section className="mx-auto grid min-h-[52vh] max-w-2xl place-items-center"><Card className="w-full rounded-[1.6rem] border-border/70 p-8 text-center shadow-sm"><CardHeader className="p-0"><CardTitle className="text-xl">Não foi possível carregar a administração</CardTitle><CardDescription className="mt-2">A conexão com os dados administrativos falhou. Tente novamente; se o problema continuar, recarregue a página.</CardDescription></CardHeader><CardContent className="pt-6"><Button onClick={onRetry} className="rounded-xl font-bold">Tentar novamente</Button></CardContent></Card></section>; }
