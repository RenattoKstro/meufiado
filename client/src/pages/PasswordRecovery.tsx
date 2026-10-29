import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, KeyRound, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import React from "react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function PasswordRecovery() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setHasRecoverySession(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (active && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) setHasRecoverySession(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function requestReset(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const { data: resolvedEmail, error: resolveError } = await supabase.rpc("resolve_login_identifier", { identifier: identifier.trim() });
      if (resolveError || typeof resolvedEmail !== "string" || !resolvedEmail.includes("@") || resolvedEmail.endsWith(".invalid")) {
        toast.error("Informe um usuário ou e-mail com endereço de recuperação válido.");
        return;
      }
      const redirectTo = `${window.location.origin}/?recovery=1`;
      const { error } = await supabase.auth.resetPasswordForEmail(resolvedEmail, { redirectTo });
      if (error) throw error;
      setSent(true);
      toast.success("Se o cadastro permitir recuperação, enviaremos as instruções para o e-mail vinculado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível solicitar a recuperação.");
    } finally {
      setPending(false);
    }
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return toast.error("A nova senha deve ter pelo menos 8 caracteres.");
    if (password !== confirmation) return toast.error("A confirmação da senha não confere.");
    setPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Senha atualizada. Entre novamente com a nova senha.");
      navigate("/entrar");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a senha.");
    } finally {
      setPending(false);
    }
  }

  const updating = hasRecoverySession || new URLSearchParams(window.location.search).get("recovery") === "1" || window.location.pathname === "/redefinir-senha";
  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_18%_18%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_34%)] p-5">
    <Card className="w-full max-w-md rounded-[2rem] border-border/70 shadow-2xl shadow-primary/10">
      <CardHeader className="p-7 pb-3 sm:p-9 sm:pb-4">
        <Link href="/entrar" className="mb-6 inline-flex items-center text-xs font-bold text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao acesso</Link>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">{updating ? <KeyRound className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}</span>
        <CardTitle className="mt-5 text-2xl font-black tracking-tight">{updating ? "Definir nova senha" : "Recuperar acesso"}</CardTitle>
        <CardDescription className="mt-2 leading-relaxed">{updating ? "Escolha uma senha nova para continuar usando o Meu Fiado." : "Informe seu usuário ou e-mail. O Supabase enviará um link seguro para o endereço cadastrado."}</CardDescription>
      </CardHeader>
      <CardContent className="p-7 pt-4 sm:p-9 sm:pt-5">
        {updating ? <form className="space-y-4" onSubmit={updatePassword}><div className="space-y-2"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirmar nova senha</Label><Input id="confirm-password" type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required /></div><Button type="submit" className="w-full rounded-xl font-extrabold" disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar nova senha</Button></form> : sent ? <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed text-muted-foreground"><MailCheck className="mb-3 h-6 w-6 text-primary" /><p className="font-extrabold text-foreground">Verifique seu e-mail</p><p className="mt-1">Abra o link recebido para criar uma nova senha. Se não encontrar, verifique a pasta de spam.</p></div> : <form className="space-y-4" onSubmit={requestReset}><div className="space-y-2"><Label htmlFor="recovery-identifier">Usuário ou e-mail</Label><Input id="recovery-identifier" autoComplete="username" value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="Ex.: admin ou seu e-mail" required /></div><Button type="submit" className="w-full rounded-xl font-extrabold" disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar link de recuperação</Button></form>}
      </CardContent>
    </Card>
  </main>;
}
