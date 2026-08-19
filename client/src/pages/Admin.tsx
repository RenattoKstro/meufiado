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
import { Activity, Building2, CalendarOff, CheckCircle2, FileSpreadsheet, KeyRound, Loader2, UploadCloud, UserPlus, Users } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { analyticRowFromSpreadsheet, branchRowFromSpreadsheet } from "../../../shared/importRules";

const INACTIVITY_DAYS = 7;
type SpreadsheetRow = (string | number | null)[];
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
  const branches = branchesQuery.data || [];
  return <section className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Gestão da operação</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Painel administrativo</h1><p className="mt-2 text-sm text-muted-foreground">Gerencie usuários, filiais, metas e importações da operação.</p></div>
      <div className="flex flex-wrap gap-2"><CredentialsDialog /><SpreadsheetImportDialog kind="branches" onComplete={refresh} /><SpreadsheetImportDialog kind="analytics" onComplete={refresh} /><BranchDialog onComplete={refresh} /><UserDialog branches={branches} onComplete={refresh} /></div>
    </header>
    <div className="grid gap-4 sm:grid-cols-3"><Stat icon={Users} label="Usuários ativos" value={active.length} tone="primary" /><Stat icon={CalendarOff} label="Em férias" value={vacation.length} tone="amber" /><Stat icon={Activity} label={`Inativos há ${INACTIVITY_DAYS}+ dias`} value={inactive.length} tone="violet" /></div>
    <Tabs defaultValue="users" className="mt-7">
      <TabsList className="h-auto rounded-xl bg-muted p-1"><TabsTrigger value="users" className="rounded-lg px-4 py-2 text-xs font-bold">Usuários</TabsTrigger><TabsTrigger value="branches" className="rounded-lg px-4 py-2 text-xs font-bold">Filiais</TabsTrigger><TabsTrigger value="alerts" className="rounded-lg px-4 py-2 text-xs font-bold">Atenções</TabsTrigger></TabsList>
      <TabsContent value="users" className="mt-5"><Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader className="border-b border-border/70"><CardTitle className="text-lg">Operadores cadastrados</CardTitle><CardDescription>Ative ou desative acessos, altere a função e conceda perfil administrativo.</CardDescription></CardHeader><CardContent className="p-0"><div className="divide-y divide-border/70">{users.length === 0 ? <EmptyState text="Ainda não há operadores cadastrados." /> : users.map(item => { const hasAccount = Boolean(item.account); const idleDays = item.account?.lastSignedIn ? Math.floor((now - new Date(item.account.lastSignedIn).getTime()) / 86400000) : undefined; return <div key={item.profile.id} className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-extrabold">{item.profile.fullName}</p>{!item.profile.isActive && <Badge variant="secondary" className="rounded-full bg-destructive/10 text-destructive">Inativo</Badge>}{item.profile.isOnVacation && <Badge variant="secondary" className="rounded-full bg-amber-500/10 text-amber-600">Férias</Badge>}{hasAccount && item.account?.role === "admin" && <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Admin</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{item.branch.name} · {item.profile.email} · {hasAccount ? `último login há ${idleDays ?? 0} dias` : "aguardando primeiro login"}</p></div><div className="grid grid-cols-3 items-center gap-3 xl:flex"><Select value={item.profile.operatorType} onValueChange={value => changeUser(item.profile.id, { operatorType: value as "leader" | "assistant" })}><SelectTrigger className="h-9 w-full text-xs xl:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="leader">Líder</SelectItem><SelectItem value="assistant">Auxiliar</SelectItem></SelectContent></Select><div className="flex items-center gap-2 text-xs font-bold"><Switch checked={item.profile.isActive} onCheckedChange={checked => changeUser(item.profile.id, { isActive: checked })} /><span className="hidden xl:inline">Acesso</span></div><div className="flex items-center gap-2 text-xs font-bold"><Switch checked={item.profile.isOnVacation} onCheckedChange={checked => changeUser(item.profile.id, { isOnVacation: checked })} /><span className="hidden xl:inline">Férias</span></div>{item.profile.userId && <Button size="sm" variant="outline" className="h-9 rounded-lg text-xs" onClick={() => changeRole(item.profile.userId!, item.account?.role === "admin" ? "user" : "admin")}>{item.account?.role === "admin" ? "Remover admin" : "Promover"}</Button>}</div></div>; })}</div></CardContent></Card></TabsContent>
      <TabsContent value="branches" className="mt-5"><Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="text-lg">Filiais</CardTitle><CardDescription>Cadastre manualmente ou importe uma planilha com ID, Regional e Filial.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{branches.map(branch => <BranchCard key={branch.id} branch={branch} onComplete={refresh} />)}{branches.length === 0 && <EmptyState text="Cadastre ou importe sua primeira filial para começar." />}</CardContent></Card></TabsContent>
      <TabsContent value="alerts" className="mt-5"><div className="grid gap-5 lg:grid-cols-2"><AlertPanel title="Usuários inativos" description={`Sem login há ${INACTIVITY_DAYS} ou mais dias, ou ainda sem primeiro acesso.`} items={inactive.map(item => item.profile.fullName)} icon={Activity} /><AlertPanel title="Usuários em férias" description="Marcados pelo operador ou pela administração." items={vacation.map(item => item.profile.fullName)} icon={CalendarOff} /></div></TabsContent>
    </Tabs>
  </section>;
}

function SpreadsheetImportDialog({ kind, onComplete }: { kind: "branches" | "analytics"; onComplete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const importBranches = trpc.admin.importBranches.useMutation();
  const importAnalytics = trpc.admin.importAnalytics.useMutation();
  const isBranches = kind === "branches";
  const title = isBranches ? "Importar filiais" : "Importar metas do Analítico";
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
        toast.success(`${result.imported} metas aplicadas, ${result.unmatched} sem filial e ${result.skipped} repetidas ignoradas.`);
      }
      await onComplete();
      setOpen(false); setRows([]); setFileName("");
    } catch { toast.error("A importação não pôde ser concluída. Revise as colunas e tente novamente."); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="rounded-xl font-bold"><FileSpreadsheet className="mr-2 h-4 w-4" />{isBranches ? "Importar filiais" : "Importar metas"}</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>O arquivo é lido no navegador e enviado somente após sua confirmação. Colunas esperadas: {columns}.</DialogDescription></DialogHeader><div className="space-y-5"><div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5"><Label htmlFor={`spreadsheet-${kind}`} className="flex cursor-pointer flex-col items-center gap-2 text-center"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"><UploadCloud className="h-5 w-5" /></span><span className="font-bold">Selecionar planilha Excel</span><span className="text-xs font-normal text-muted-foreground">Arquivos .xlsx, .xls ou .csv</span></Label><Input id={`spreadsheet-${kind}`} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={loadFile} /></div>{fileName && <div className="rounded-xl border border-border/70 bg-muted/40 p-4"><p className="flex items-center gap-2 text-sm font-extrabold"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{fileName}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><ImportCount label="Lidas" value={rows.length} /><ImportCount label="Válidas" value={validRows} tone="text-emerald-600" /><ImportCount label="Incompletas" value={invalidRows} tone={invalidRows ? "text-destructive" : undefined} /><ImportCount label="Duplicadas" value={duplicateRows} tone={duplicateRows ? "text-amber-600" : undefined} /></div><p className="mt-3 text-xs font-bold text-primary">{readyRows} linha{readyRows === 1 ? "" : "s"} será{readyRows === 1 ? "" : "ão"} enviada{readyRows === 1 ? "" : "s"} para processamento.</p></div>}{rows.length > 0 && <div className="overflow-hidden rounded-xl border border-border/70"><div className="border-b border-border/70 bg-muted/40 px-4 py-3 text-xs font-extrabold">Prévia e validação das primeiras linhas</div><div className="max-h-44 overflow-auto"><table className="w-full text-left text-xs"><tbody>{rows.slice(0, 5).map((row, index) => <tr key={index} className="border-b border-border/50 last:border-0"><td className="w-10 px-3 py-2 font-bold text-muted-foreground">{index + 2}</td><td className="px-3 py-2 text-muted-foreground">{row.filter(value => value !== null && value !== "").slice(0, 6).join(" · ") || "Linha vazia"}</td><td className="px-3 py-2 text-right font-bold"><span className={isValidRow(row) ? "text-emerald-600" : "text-destructive"}>{isValidRow(row) ? "Válida" : "Incompleta"}</span></td></tr>)}</tbody></table></div></div>}<Button className="w-full rounded-xl" disabled={!readyRows || loading} onClick={confirmImport}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}Confirmar importação de {readyRows} linha{readyRows === 1 ? "" : "s"}</Button></div></DialogContent></Dialog>;
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
