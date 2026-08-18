import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function SecuritySettings({ required = false }: { required?: boolean }) {
  const status = trpc.userAuth.status.useQuery();
  const change = trpc.userAuth.changePassword.useMutation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  if (status.isLoading) return <div className="mx-auto max-w-xl"><div className="h-64 animate-pulse rounded-[1.6rem] bg-muted" /></div>;
  if (!status.data?.hasPassword) return <section className="mx-auto max-w-3xl"><header className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Segurança</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Senha de acesso</h1></header><Card className="rounded-[1.6rem] border-border/70"><CardContent className="p-6 text-sm text-muted-foreground">Esta conta usa autenticação por Google. A senha local é exibida apenas para operadores cadastrados pela administração.</CardContent></Card></section>;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) return toast.error("A confirmação não corresponde à nova senha.");
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      await status.refetch();
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      toast.success("Senha atualizada com sucesso.");
    } catch { toast.error("Não foi possível alterar a senha. Confira a senha atual."); }
  }
  return <section className="mx-auto max-w-xl"><header className="mb-8 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-primary">Segurança da conta</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">{required ? "Defina sua senha pessoal" : "Alterar senha"}</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{required ? "Sua senha inicial é temporária. Crie agora uma senha que somente você conheça." : "Mantenha seu acesso protegido com uma senha forte e exclusiva."}</p></header><Card className="rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="h-5 w-5 text-primary" />Credenciais de acesso</CardTitle><CardDescription>A nova senha precisa ter pelo menos 8 caracteres.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-5"><div className="space-y-2"><Label>Senha atual</Label><Input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" required autoFocus={required} /></div><div className="space-y-2"><Label>Nova senha</Label><Input type="password" minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" required /></div><div className="space-y-2"><Label>Confirmar nova senha</Label><Input type="password" minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" required /></div><Button type="submit" className="h-11 w-full rounded-xl font-extrabold" disabled={change.isPending}>{change.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}{required ? "Salvar e continuar" : "Atualizar senha"}</Button></form></CardContent></Card></section>;
}
