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
    expect(source).toContain('mode="login"');
    expect(source).toContain('href="/cadastro"');
    expect(source).not.toContain("Entrar com senha");
    expect(source).not.toContain("userAuth");
  });

  it("oferece opções distintas de entrar e cadastrar na tela inicial", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/pages/Welcome.tsx"), "utf8");
    expect(source).toContain('href="/entrar"');
    expect(source).toContain('href="/cadastro"');
    expect(source).toContain("Entrar no painel");
    expect(source).toContain(">Cadastrar<");
  });

  it("mostra a conexão Google de cadastro somente depois da escolha de cadastrar", async () => {
    const login = await readFile(resolve(process.cwd(), "client/src/pages/UserLogin.tsx"), "utf8");
    const registration = await readFile(resolve(process.cwd(), "client/src/pages/UserRegistration.tsx"), "utf8");
    expect(login).toContain('mode="login"');
    expect(registration).toContain('GoogleOperatorSignIn mode="register"');
    expect(registration).toContain("Primeiro, conecte sua conta Google.");
  });

  it("direciona acessos não autenticados à tela do Google direto", () => {
    vi.stubGlobal("window", { location: { href: "" } });

    startLogin();

    expect(window.location.href).toBe("/entrar");
  });

  it("redireciona uma sessão ativa da rota de entrada para a Visão geral", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(source).toContain('["/entrar", "/cadastro"].includes(location)');
  });

  it("direciona apenas operadores sem perfil ao onboarding e mantém páginas disponíveis ao administrador", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(source).toContain('if (!hasOperatorProfile && user.role !== "admin") return <Onboarding />;');
    expect(source).not.toContain("DashboardLayout adminOnly");
    ["/fiado", "/desafio", "/filiais", "/ajustes", "/admin"].forEach(path => {
      expect(source).toContain(`path=\"${path}\"`);
    });
    expect(source).toContain('Route path="/cadastro" component={UserRegistration}');
  });

  it("mantém a navegação completa e acrescenta Administração para administradores", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(source).toContain('const menu = user?.role === "admin" ? [...navigation, administrativeNavigation] : navigation;');
    expect(source).not.toContain("adminOnly");
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
