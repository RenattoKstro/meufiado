import GoogleOperatorSignIn from "@/components/GoogleOperatorSignIn";
import { ArrowLeft, UserPlus } from "lucide-react";
import React from "react";
import { Link } from "wouter";

export default function UserRegistration() {
  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_18%_18%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_34%)] p-5">
    <section className="w-full max-w-md rounded-[2rem] border border-border/70 bg-card p-7 shadow-2xl shadow-primary/10 sm:p-9">
      <Link href="/" className="inline-flex items-center text-xs font-bold text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
      <span className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><UserPlus className="h-5 w-5" /></span>
      <h1 className="mt-5 text-2xl font-black tracking-tight">Criar cadastro</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Primeiro, conecte sua conta Google. Em seguida, você informará filial, telefone e os demais dados obrigatórios.</p>
      <div className="mt-7 flex justify-center"><GoogleOperatorSignIn mode="register" /></div>
      <p className="mt-5 text-center text-xs font-semibold text-muted-foreground">Já possui cadastro? <Link href="/entrar" className="text-primary hover:underline">Entrar no painel</Link></p>
      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">O Meu Fiado não solicita nem armazena a senha da sua conta Google.</p>
    </section>
  </main>;
}
