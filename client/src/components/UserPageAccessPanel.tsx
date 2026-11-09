import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type PageKey = "overview" | "matrix" | "branches" | "history" | "utilities" | "chat" | "metrics" | "appearance" | "help" | "updates";
type UserRow = { profile: { userId: number | null; fullName: string }; account: { id: number; email: string | null; role: "admin" | "user"; pageAccessJson?: string | null } | null };
const pages: Array<{ key: PageKey; label: string }> = [
  { key: "overview", label: "Visão Geral" }, { key: "matrix", label: "Matriz" }, { key: "branches", label: "Filiais" },
  { key: "history", label: "Históricos" }, { key: "utilities", label: "Utilidades" }, { key: "chat", label: "Chat" },
  { key: "metrics", label: "Ajustes" }, { key: "appearance", label: "Preferências" }, { key: "help", label: "Ajuda" }, { key: "updates", label: "Atualizações" },
];
function parse(value: string | null | undefined): Record<PageKey, boolean> {
  const result = {} as Record<PageKey, boolean>;
  try { const parsed = JSON.parse(value || "{}"); for (const page of pages) result[page.key] = parsed?.[page.key] === true; } catch { for (const page of pages) result[page.key] = false; }
  return result;
}

export default function UserPageAccessPanel({ users }: { users: UserRow[] }) {
  const updateAccess = api.subscriptionAdmin.updateUserPageAccess.useMutation();
  const operators = useMemo(() => users.filter(item => item.account && item.account.role !== "admin") as UserRow[], [users]);
  const [selectedId, setSelectedId] = useState("");
  const selected = operators.find(item => String(item.account?.id) === selectedId) ?? null;
  const [access, setAccess] = useState<Record<PageKey, boolean>>(() => parse(null));
  useEffect(() => { setAccess(parse(selected?.account?.pageAccessJson)); }, [selectedId, selected?.account?.pageAccessJson]);
  async function save() {
    if (!selected?.account) return;
    try { await updateAccess.mutateAsync({ userId: selected.account.id, pageAccess: access }); toast.success(`Acessos individuais de ${selected.profile.fullName} salvos.`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar os acessos individuais."); }
  }
  return <Card className="rounded-[1.6rem] border-violet-500/25 bg-violet-500/[0.03] shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-violet-600" />Acesso individual por tela</CardTitle><CardDescription>Crie um acesso básico personalizado para uma pessoa específica. As telas marcadas aqui ficam liberadas mesmo que a regra global da assinatura esteja como PRO.</CardDescription></CardHeader><CardContent className="space-y-4"><select aria-label="Selecionar usuário para configurar acesso" value={selectedId} onChange={event => setSelectedId(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold"><option value="">Selecione um usuário</option>{operators.map(item => <option key={item.account!.id} value={item.account!.id}>{item.profile.fullName} — {item.account!.email || "sem e-mail"}</option>)}</select>{selected ? <><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{pages.map(page => <label key={page.key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-3 text-sm font-bold"><input type="checkbox" checked={access[page.key]} onChange={event => setAccess(current => ({ ...current, [page.key]: event.target.checked }))} className="h-4 w-4 accent-primary" />{page.label}</label>)}</div><div className="flex flex-col justify-between gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-3 text-xs text-muted-foreground sm:flex-row sm:items-center"><span>As permissões individuais são adicionais: não removem o acesso de um usuário PRO.</span><Button type="button" className="rounded-xl font-extrabold" onClick={() => void save()} disabled={updateAccess.isPending}>{updateAccess.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Salvar acessos</Button></div></> : <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">Selecione um usuário para marcar as telas liberadas no acesso básico personalizado.</p>}</CardContent></Card>;
}
