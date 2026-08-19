import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const GOOGLE_SCRIPT_ID = "google-identity-services";
const hasGoogleIdentity = () => Boolean((window as Window & { google?: { accounts?: { id?: unknown } } }).google?.accounts?.id);

function loadGoogleIdentityServices() {
  if (hasGoogleIdentity()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const finish = () => hasGoogleIdentity() ? resolve() : reject(new Error("Google indisponível"));
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("Google indisponível")), { once: true });
      window.setTimeout(finish, 5_000);
      return;
    }
    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    const finish = () => hasGoogleIdentity() ? resolve() : reject(new Error("Google indisponível"));
    script.onload = finish;
    script.onerror = () => reject(new Error("Google indisponível"));
    document.head.appendChild(script);
    window.setTimeout(finish, 5_000);
  });
}

type GoogleOperatorSignInProps = {
  mode?: "login" | "register";
};

export default function GoogleOperatorSignIn({ mode = "login" }: GoogleOperatorSignInProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const config = trpc.googleAuth.config.useQuery();
  const login = trpc.googleAuth.login.useMutation();
  const { refresh } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const clientId = config.data?.clientId;
    if (!clientId || !mountRef.current) return;
    let disposed = false;
    async function renderGoogleButton() {
      try {
        await loadGoogleIdentityServices();
        const google = (window as Window & { google?: any }).google;
        if (disposed || !google?.accounts?.id || !mountRef.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }: { credential?: string }) => {
            if (!credential) return toast.error("Não foi possível receber a confirmação do Google.");
            try {
              const result = await login.mutateAsync({ credential, mode });
              if (!result.success) {
                return toast.error(result.reason === "not_registered"
                  ? "Não encontramos um cadastro para este e-mail. Clique em Cadastrar para criar o seu acesso."
                  : "Não foi possível concluir o acesso com esta conta Google. Tente novamente.");
              }
              await refresh();
              setLocation("/");
            } catch {
              toast.error("Não foi possível validar este acesso pelo Google.");
            }
          },
        });
        mountRef.current.replaceChildren();
        google.accounts.id.renderButton(mountRef.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: 340, locale: "pt-BR" });
        setStatus("ready");
      } catch {
        if (!disposed) setStatus("error");
      }
    }
    void renderGoogleButton();
    return () => { disposed = true; };
  }, [config.data?.clientId, login, mode, refresh, setLocation]);

  return <div className="min-h-12 w-[340px]">
    <div className={status === "ready" ? "min-h-12" : "hidden"} ref={mountRef} aria-label="Entrar com Google" />
    {(config.isLoading || status === "loading") && <div className="flex h-12 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparando acesso Google…</div>}
    {(config.isError || status === "error") && <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center text-xs font-semibold text-destructive">Não foi possível carregar o acesso do Google. Tente novamente em instantes.</p>}
  </div>;
}
