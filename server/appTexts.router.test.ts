import type { TrpcContext } from "./_core/context";
import { createAppRouter } from "./routers";
import { describe, expect, it, vi } from "vitest";

const appTexts = {
  appName: "Meu Fiado",
  slogan: "Acompanhando de perto suas metas todos dias.",
  welcomeTitle: "Acompanhe suas metas de recebimento",
  welcomeDescription: "Tenha uma visão clara das metas, indicadores e resultados da sua filial.",
  overviewTitle: "Visão Geral",
  overviewDescription: "Confira o desempenho e a projeção do seu recebimento.",
  utilitiesTitle: "Utilidades",
  utilitiesDescription: "Arquivos, relatórios e ferramentas para apoiar sua rotina.",
  subscriptionTitle: "Plano",
  subscriptionDescription: "Gerencie seu acesso e envie o comprovante após o pagamento.",
  navOverview: "Visão Geral",
  navBranches: "Filiais",
  navHistory: "Históricos",
  navUtilities: "Utilidades",
  navChat: "Chat",
  navSettings: "Ajustes",
  navPreferences: "Preferências",
  navAccount: "Conta",
};

function contextFor(role: "user" | "admin" | null): TrpcContext {
  return {
    user: role ? { id: 11, openId: "app-texts-test", email: "teste@example.com", name: "Pessoa de teste", loginMethod: "google", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("procedures de textos do aplicativo", () => {
  it("expõe os textos padrão publicamente para a tela de boas-vindas", async () => {
    const getAppTextSettings = vi.fn().mockResolvedValue({ id: 1, ...appTexts, updatedAt: new Date() });
    const router = createAppRouter({ getAppTextSettings });

    await expect(router.createCaller(contextFor(null)).appTexts.get()).resolves.toMatchObject(appTexts);
    expect(getAppTextSettings).toHaveBeenCalledTimes(1);
  });

  it("permite que somente o administrador atualize os textos", async () => {
    const updateAppTextSettings = vi.fn().mockResolvedValue({ id: 1, ...appTexts, appName: "Cobrança da Rede", updatedAt: new Date() });
    const router = createAppRouter({ getAppTextSettings: vi.fn().mockResolvedValue({ id: 1, ...appTexts, updatedAt: new Date() }), updateAppTextSettings });

    await expect(router.createCaller(contextFor("user")).appTexts.update({ ...appTexts, appName: "Cobrança da Rede" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(router.createCaller(contextFor("admin")).appTexts.update({ ...appTexts, appName: "Cobrança da Rede" })).resolves.toMatchObject({ appName: "Cobrança da Rede" });
    expect(updateAppTextSettings).toHaveBeenCalledWith(expect.objectContaining({ appName: "Cobrança da Rede" }));
  });
});
