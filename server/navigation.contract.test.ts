import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { startLogin } from "../client/src/const";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("contrato da navegação lateral", () => {
  it("usa links nativos para as rotas do painel", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(source).toContain('import { Link, useLocation } from "wouter"');
    expect(source).toContain("<Link href={item.path}>");
    ["/fiado", "/desafio", "/filiais", "/ajustes", "/configuracoes"].forEach(path => {
      expect(source).toContain(`path: "${path}"`);
    });
  });

  it("mantém apenas o acesso direto do Google disponível ao operador", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/pages/UserLogin.tsx"), "utf8");
    expect(source).toContain('import GoogleOperatorSignIn from "@/components/GoogleOperatorSignIn"');
    expect(source).toContain("autenticado diretamente pelo Google");
    expect(source).not.toContain("Entrar com senha");
    expect(source).not.toContain("userAuth");
  });

  it("direciona acessos não autenticados à tela do Google direto", () => {
    vi.stubGlobal("window", { location: { href: "" } });

    startLogin();

    expect(window.location.href).toBe("/entrar");
  });

  it("redireciona uma sessão ativa da rota de entrada para a Visão geral", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(source).toContain('if (user && location === "/entrar") navigate("/", { replace: true })');
  });

  it("direciona perfis criados no primeiro acesso Google ao onboarding", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(source).toContain('if (!profileQuery.data?.profile || !profileQuery.data.profile.profileComplete) return <Onboarding />');
  });

  it("mantém o ponto de montagem do Google disponível durante o carregamento", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/components/GoogleOperatorSignIn.tsx"), "utf8");
    expect(source).toContain('className={status === "ready" ? "min-h-12" : "hidden"} ref={mountRef}');
    expect(source).toContain("window.setTimeout(finish, 5_000)");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
