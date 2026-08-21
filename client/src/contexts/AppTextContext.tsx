import { trpc } from "@/lib/trpc";
import { createContext, useContext, type ReactNode } from "react";

export const DEFAULT_APP_TEXTS = {
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

export type AppTexts = typeof DEFAULT_APP_TEXTS;

const AppTextContext = createContext<AppTexts>(DEFAULT_APP_TEXTS);

export function AppTextProvider({ children }: { children: ReactNode }) {
  const query = trpc.appTexts.get.useQuery(undefined, {
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const texts: AppTexts = query.data ? { ...DEFAULT_APP_TEXTS, ...query.data } : DEFAULT_APP_TEXTS;

  return <AppTextContext.Provider value={texts}>{children}</AppTextContext.Provider>;
}

export function useAppTexts() {
  return useContext(AppTextContext);
}
