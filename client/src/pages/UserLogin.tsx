import GoogleOperatorSignIn from "@/components/GoogleOperatorSignIn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, UserRoundCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function UserLogin() {
  const [mode, setMode] = useState<"google" | "local">("google");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.localAuth.login.useMutation();
  const { refresh } = useAuth();
  const [, navigate] = useLocation();
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await login.mutateAsync({ username, password });
      if (!result.success) return toast.error("Usuário ou senha inválidos.");
      await refresh();
      navigate("/");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir o acesso."); }
  }
  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_18%_18%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_34%)] p-5"><section className="w-full max-w-md rounded-[2rem] border border-border/70 bg-card p-7 shadow-2xl shadow-primary/10 sm:p-9"><Link href="/" className="inline-flex items-center text-xs font-bold text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link><span className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><UserRoundCheck className="h-5 w-5" /></span><h1 className="mt-5 text-2xl font-black tracking-tight">Entrar no painel</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Escolha como deseja acessar suas metas e recebimentos.</p><div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1"><Button type="button" variant={mode === "google" ? "default" : "ghost"} className="rounded-lg" onClick={() => setMode("google")}>Google</Button><Button type="button" variant={mode === "local" ? "default" : "ghost"} className="rounded-lg" onClick={() => setMode("local")}>Usuário e senha</Button></div>{mode === "google" ? <><div className="mt-7 flex justify-center"><GoogleOperatorSignIn mode="login" /></div><p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">O Meu Fiado não solicita nem armazena a senha da sua conta Google.</p></> : <form className="mt-7 space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="local-username">Usuário</Label><Input id="local-username" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="Ex.: Renato" required /></div><div className="space-y-2"><Label htmlFor="local-password">Senha</Label><Input id="local-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></div><Button type="submit" className="w-full rounded-xl font-extrabold" disabled={login.isPending}>{login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Entrar</Button><p className="text-center text-[11px] leading-relaxed text-muted-foreground">O usuário e a senha são fornecidos exclusivamente pela administração.</p></form>}<p className="mt-5 text-center text-xs font-semibold text-muted-foreground">Ainda não possui cadastro? <Link href="/cadastro" className="text-primary hover:underline">Cadastrar agora</Link></p></section></main>;
}
