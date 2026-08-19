import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const GOOGLE_SCRIPT_ID = "google-identity-services";

function loadGoogleIdentityServices() {
  if ((window as Window & { google?: unknown }).google) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google indisponível")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google indisponível"));
    document.head.appendChild(script);
  });
}

export default function GoogleOperatorSignIn() {
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
              const result = await login.mutateAsync({ credential });
              if (!result.success) return toast.error("Use uma conta Google com o mesmo e-mail autorizado pela administração.");
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
  }, [config.data?.clientId, login, refresh, setLocation]);

  if (config.isLoading || status === "loading") return <div className="flex h-12 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparando acesso Google…</div>;
  if (config.isError || status === "error") return <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center text-xs font-semibold text-destructive">Não foi possível carregar o acesso do Google. Tente novamente em instantes.</p>;
  return <div className="min-h-12" ref={mountRef} aria-label="Entrar com Google" />;
}
