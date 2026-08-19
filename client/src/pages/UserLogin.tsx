import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Globe2, KeyRound, Loader2, UserRoundCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function UserLogin() {
  const login = trpc.userAuth.login.useMutation();
  const { refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await login.mutateAsync({ email, password });
      if (!result.success) return toast.error("E-mail ou senha inválidos.");
      await refresh();
      setLocation("/");
    } catch { toast.error("Não foi possível concluir o acesso."); }
  }
  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_18%_18%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_34%)] p-5">
    <section className="w-full max-w-md rounded-[2rem] border border-border/70 bg-card p-7 shadow-2xl shadow-primary/10 sm:p-9">
      <Link href="/" className="inline-flex items-center text-xs font-bold text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
      <span className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><UserRoundCheck className="h-5 w-5" /></span>
      <h1 className="mt-5 text-2xl font-black tracking-tight">Acesso do operador</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Entre com sua conta Google ou use o e-mail e a senha inicial enviados pela administração. No primeiro acesso com senha, você criará uma senha pessoal.</p>
      <Button type="button" variant="outline" size="lg" className="mt-7 h-12 w-full rounded-xl border-border/80 bg-background font-extrabold hover:bg-muted" onClick={startLogin}><Globe2 className="mr-2 h-4 w-4 text-primary" />Continuar com Google</Button>
      <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-border" /><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">ou use senha</span><span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={submit} className="space-y-5"><div className="space-y-2"><Label htmlFor="operator-email">E-mail</Label><Input id="operator-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></div><div className="space-y-2"><Label htmlFor="operator-password">Senha</Label><Input id="operator-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></div><Button type="submit" size="lg" className="h-12 w-full rounded-xl font-extrabold" disabled={login.isPending}>{login.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Entrar com senha</Button></form>
      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">Use no Google o mesmo e-mail vinculado ao seu cadastro de operador.</p>
    </section>
  </main>;
}
