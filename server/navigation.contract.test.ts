import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { startLogin } from "../client/src/const";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("contrato da navegação lateral", () => {
  it("usa links nativos para as rotas do painel", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(source).toContain('import { Link, useLocation } from "wouter"');
    expect(source).toContain("<Link href={item.path}>");
    ["/filiais", "/ajustes", "/configuracoes"].forEach(path => {
      expect(source).toContain(`path: "${path}"`);
    });
    expect(source).not.toContain('label: "Meta Fiado"');
    expect(source).not.toContain('label: "Meta Desafio"');
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
    ["/fiado", "/desafio", "/filiais", "/historicos", "/ajustes", "/admin"].forEach(path => {
      expect(source).toContain(`path=\"${path}\"`);
    });
    expect(source).toContain('Route path="/cadastro" component={UserRegistration}');
  });

  it("mantém a navegação consolidada e acrescenta Administração para administradores", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(source).toContain('const menu = user?.role === "admin" ? [...navigation, administrativeNavigation] : navigation;');
    expect(source).not.toContain("adminOnly");
  });

  it("separa Preferências de Ajustes e disponibiliza o chat na navegação", async () => {
    const navigation = await readFile(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    const app = await readFile(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(navigation).toContain("label: texts.navChat");
    expect(navigation).toContain("label: texts.navPreferences");
    expect(app).toContain('path="/configuracoes" component={AppearanceSettings}');
    expect(app).toContain('path="/ajustes" component={MetricsSettings}');
  });

  it("disponibiliza uma Ajuda com manual para os recursos principais do painel", async () => {
    const navigation = await readFile(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    const app = await readFile(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const help = await readFile(resolve(process.cwd(), "client/src/pages/Help.tsx"), "utf8");

    expect(navigation).toContain('label: "Ajuda", path: "/ajuda", icon: CircleHelp');
    expect(app).toContain('Route path="/ajuda" component={Help}');
    ["Como usar o Meu Fiado", "Visão Geral e metas", "Históricos e recebimentos diários", "Filiais e Matriz", "Plano Free e PRO", "Administração"].forEach(title => {
      expect(help).toContain(title);
    });
    expect(help).toContain("Digite até quatro códigos separados por vírgula");
    expect(help).toContain("Meta Diária é calculada pelo valor que falta");
    expect(help).toContain("trpc.chat.supportRecipient.useQuery");
    expect(help).toContain('setLocation(`/chat?perfil=${recipient.id}`)');
    expect(help).toContain("Falar com administrador");
    expect(help).toContain("availabilityLabel");
    expect(help).toContain("isOnline");

    const router = await readFile(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(router).toContain("supportRecipient: protectedProcedure.query");
    expect(router).toContain("getChatSupportAdmin(ctx.user.id)");
    expect(router).toContain("presence: protectedProcedure.mutation");
  });

  it("mantém a ativação de Meta Perdido nos Ajustes das metas", async () => {
    const settings = await readFile(resolve(process.cwd(), "client/src/pages/Settings.tsx"), "utf8");
    const metrics = settings.slice(settings.indexOf("export function MetricsSettings()"), settings.indexOf("export function AppearanceSettings()"));
    const appearance = settings.slice(settings.indexOf("export function AppearanceSettings()"));

    expect(metrics).toContain("Ativar Meta Perdido");
    expect(metrics).toContain("setLostGoal");
    expect(appearance).not.toContain("Ativar Meta Perdido");
    expect(appearance).not.toContain("Metas no painel");
  });

  it("atualiza o chat em intervalos curtos e mostra erro de comunicação", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/pages/Chat.tsx"), "utf8");
    expect(source).toContain("refetchInterval: 5_000");
    expect(source).toContain("Não foi possível carregar as mensagens.");
    expect(source).toContain("Não foi possível enviar a mensagem. Tente novamente.");
    expect(source).toContain("Respostas rápidas");
  });

  it("registra Utilidades na navegação e disponibiliza Downloads e Relatórios", async () => {
    const navigation = await readFile(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    const app = await readFile(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const utilities = await readFile(resolve(process.cwd(), "client/src/pages/Utilities.tsx"), "utf8");
    expect(navigation).toContain("label: texts.navUtilities");
    expect(app).toContain('Route path="/utilidades">');
    expect(utilities).toContain("Downloads disponíveis");
    expect(utilities).toContain("Relatórios");
    expect(utilities).toContain("Accordion");
    expect(utilities).toContain("Fixar no topo");
    expect(utilities).toContain("Visível aos usuários");
  });

  it("registra a guia Históricos para lançamentos diários por filial", async () => {
    const navigation = await readFile(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    const app = await readFile(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const history = await readFile(resolve(process.cwd(), "client/src/pages/History.tsx"), "utf8");
    expect(navigation).toContain("label: texts.navHistory");
    expect(app).toContain('Route path="/historicos">');
    expect(history).toContain("Salvar recebimento");
    expect(history).toContain("Líder e auxiliar compartilham o mesmo histórico da filial.");
    expect(history).toContain("Editar recebimento");
    expect(history).toContain("Excluir este lançamento diário?");
  });

  it("interpreta o controle de página marcado como acesso exclusivo do plano PRO", async () => {
    const panel = await readFile(resolve(process.cwd(), "client/src/components/SubscriptionAdminPanel.tsx"), "utf8");
    const app = await readFile(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const navigation = await readFile(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");

    expect(panel).toContain('const isProOnly = form[settingKey] === "pro"');
    expect(panel).toContain('checked={isProOnly}');
    expect(panel).toContain('[settingKey]: checked ? "pro" : "free"');
    expect(panel).toContain('exclusiva para PRO');
    expect(app).toContain("refetchInterval: 15_000");
    expect(navigation).toContain("refetchInterval: 15_000");
  });

  it("mantém a gestão de materiais e relatórios restrita às procedures administrativas", async () => {
    const router = await readFile(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(router).toContain("downloads: protectedProcedure.query");
    expect(router).toContain("reports: protectedProcedure.query");
    expect(router).toContain("createDownload: adminProcedure");
    expect(router).toContain("createReport: adminProcedure");
    expect(router).toContain("deleteDownload: adminProcedure");
    expect(router).toContain("deleteReport: adminProcedure");
  });

  it("mantém o aviso da Matriz conciso e contém valores extensos de Vendas", async () => {
    const matrix = await readFile(resolve(process.cwd(), "client/src/pages/Matrix.tsx"), "utf8");

    expect(matrix).toContain("Dados somente para consulta.</strong> A atualização é exclusiva da Administração.");
    expect(matrix).toContain("const compactMoney");
    expect(matrix).toContain('value={compact ? compactMoney(data.sales) : money(data.sales)} exactValue={money(data.sales)} tone="emerald"');
    expect(matrix).toContain('title={exactValue ?? value}');
    expect(matrix).toContain("min-w-0 overflow-hidden rounded-2xl px-3 py-3");
    expect(matrix).toContain('<MatrixDetail label="Vendas" value={money(data.sales)} tone="emerald" />');
  });

  it("permite comparar até quatro filiais na sequência digitada e alinha Vendas com Recebido", async () => {
    const matrix = await readFile(resolve(process.cwd(), "client/src/pages/Matrix.tsx"), "utf8");

    expect(matrix).toContain("Acompanhe todas as filiais aqui.");
    expect(matrix).toContain("comparisonCodesFromSearch(searchTerm)");
    expect(matrix).toContain("sortMatrixItemsByComparisonCodes(items, comparisonCodes)");
    expect(matrix).toContain("Digite até quatro códigos separados por vírgula");
    expect(matrix).toContain('<div className="mt-4 grid grid-cols-2 gap-2"><SummaryAmount label="Vendas"');
    expect(matrix).toContain('<SummaryAmount label="Recebido"');
    expect(matrix).toContain("comparisonEffectivenessHighlights(visibleItems)");
    expect(matrix).toContain("Melhor efetividade");
    expect(matrix).toContain("Menor efetividade");
    expect(matrix).toContain("Maior efetividade Fiado");
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
