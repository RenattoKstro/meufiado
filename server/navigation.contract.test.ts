import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { decodeOAuthState } from "../shared/const";
import { startLogin } from "../client/src/const";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("contrato da navegação lateral", () => {
  it("usa links nativos para as rotas do painel", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(source).toContain('import { Link, useLocation } from "wouter"');
    expect(source).toContain("<Link href={item.path}>");
    ["/fiado", "/desafio", "/ajustes", "/configuracoes", "/seguranca"].forEach(path => {
      expect(source).toContain(`path: "${path}"`);
    });
  });

  it("mantém a entrada Google disponível no acesso de operador", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/pages/UserLogin.tsx"), "utf8");
    expect(source).toContain('import { startLogin } from "@/const"');
    expect(source).toContain("onClick={startLogin}");
    expect(source).toContain("Continuar com Google");
    expect(source).toContain("Entrar com senha");
  });

  it("inicia o OAuth seguro quando o operador escolhe continuar com Google", () => {
    vi.stubEnv("VITE_OAUTH_PORTAL_URL", "https://auth.example.com");
    vi.stubEnv("VITE_APP_ID", "meu-fiado-app");
    vi.stubGlobal("window", { location: { origin: "https://meu-fiado.example.com", href: "" } });
    vi.stubGlobal("document", { cookie: "" });
    vi.stubGlobal("crypto", { randomUUID: () => "nonce-do-operador" });

    startLogin();

    expect(document.cookie).toContain("__Host-oauth_state=nonce-do-operador");
    const url = new URL(window.location.href);
    expect(url.origin).toBe("https://auth.example.com");
    expect(url.pathname).toBe("/app-auth");
    expect(url.searchParams.get("appId")).toBe("meu-fiado-app");
    expect(url.searchParams.get("redirectUri")).toBe("https://meu-fiado.example.com/api/oauth/callback");
    expect(decodeOAuthState(url.searchParams.get("state") ?? "")).toEqual({ redirectUri: "https://meu-fiado.example.com/api/oauth/callback", nonce: "nonce-do-operador" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
