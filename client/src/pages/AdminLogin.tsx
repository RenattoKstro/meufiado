import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminLogin() {
  const login = trpc.adminAuth.login.useMutation();
  const { refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await login.mutateAsync({ username, password });
      if (!result.success) return toast.error("Usuário ou senha inválidos.");
      await refresh();
      setLocation("/admin");
    } catch { toast.error("Não foi possível concluir o acesso administrativo."); }
  }
  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_34%)] p-5"><section className="w-full max-w-md rounded-[2rem] border border-border/70 bg-card p-7 shadow-2xl shadow-primary/10 sm:p-9"><Link href="/" className="inline-flex items-center text-xs font-bold text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao acesso de operadores</Link><span className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span><h1 className="mt-5 text-2xl font-black tracking-tight">Acesso administrativo</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Entre para gerenciar filiais, operadores e configurações de acesso.</p><form onSubmit={submit} className="mt-7 space-y-5"><div className="space-y-2"><Label htmlFor="admin-user">Usuário</Label><Input id="admin-user" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required /></div><div className="space-y-2"><Label htmlFor="admin-password">Senha</Label><Input id="admin-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required autoFocus /></div><Button type="submit" size="lg" className="h-12 w-full rounded-xl font-extrabold" disabled={login.isPending}>{login.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Entrar como administrador</Button></form></section></main>;
}
