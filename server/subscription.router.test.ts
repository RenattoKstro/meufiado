import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getMySubscription: vi.fn(),
  getSubscriptionSettings: vi.fn(),
  updateSubscriptionSettings: vi.fn(),
  uploadSubscriptionPixQrCode: vi.fn(),
  setManagedUserPlan: vi.fn(),
  submitSubscriptionProof: vi.fn(),
  listSubscriptionProofs: vi.fn(),
  reviewSubscriptionProof: vi.fn(),
  listUtilityDownloads: vi.fn(),
  getMercadoPagoSubscription: vi.fn(),
  saveMercadoPagoSubscription: vi.fn(),
}));

const notificationMocks = vi.hoisted(() => ({ notifyOwner: vi.fn().mockResolvedValue(undefined) }));
const mercadoPagoMocks = vi.hoisted(() => ({ createRecurringPreapproval: vi.fn() }));

vi.mock("./db", async importActual => ({ ...(await importActual<typeof import("./db")>()), ...dbMocks }));
vi.mock("./_core/notification", () => notificationMocks);
vi.mock("./mercadoPago", () => mercadoPagoMocks);

import { createAppRouter } from "./routers";

function contextFor(role: "user" | "admin"): TrpcContext {
  return {
    user: { id: 31, openId: "subscription-test", email: "teste@example.com", name: "Pessoa de teste", loginMethod: "google", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { header: (name: string) => name === "host" ? "app.example.com" : name === "x-forwarded-proto" ? "https" : undefined } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const pagePlans = { overviewPlan: "free" as const, matrixPlan: "pro" as const, branchesPlan: "pro" as const, historyPlan: "pro" as const, utilitiesPlan: "free" as const, chatPlan: "pro" as const, metricsPlan: "free" as const, appearancePlan: "free" as const, helpPlan: "free" as const, updatesPlan: "free" as const };
const settings = { id: 1, monthlyPrice: 19.9, promotionOriginalPrice: 0, promotionPrice: 0, promotionBadge: "Oferta especial", promotionTitle: "Plano PRO em oferta", promotionDescription: "Aproveite o valor promocional para liberar todos os recursos PRO.", promotionBackground: "emerald", promotionCtaLabel: "Assinar PRO com Mercado Pago", planInfoTitle: "Plano PRO do Meu Fiado", planInfoDescription: "Tenha acesso aos recursos avançados e acompanhe sua assinatura por aqui.", planInfoBackground: "sky", planInfoCtaEnabled: false, planInfoCtaLabel: "", planInfoCtaUrl: "", pixKey: "pix@exemplo.com", pixCopyPaste: "0002012636...", pixQrCodeUrl: "https://example.com/qr.png", pixReceiverName: "MEU FIADO", pixReceiverBank: "Banco do Brasil", ...pagePlans, updatedByUserId: 31, createdAt: new Date(), updatedAt: new Date() };
const validSettingsInput = { monthlyPrice: 29.9, promotionOriginalPrice: 39.9, promotionPrice: 24.9, promotionBadge: "Condição especial", promotionTitle: "PRO com valor reduzido", promotionDescription: "Garanta acesso a todos os recursos com preço promocional.", promotionBackground: "violet" as const, promotionCtaLabel: "Assinar com desconto", planInfoTitle: "Oferta especial", planInfoDescription: "Assine para acessar os recursos avançados.", planInfoBackground: "violet" as const, planInfoCtaEnabled: true, planInfoCtaLabel: "Conhecer os recursos", planInfoCtaUrl: "/ajuda", pixKey: "chave-pix", pixCopyPaste: "0002012636...", pixReceiverName: "MEU FIADO", pixReceiverBank: "Banco do Brasil", ...pagePlans };

describe("procedures de assinatura", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("bloqueia páginas PRO no servidor para Free e não chama a operação protegida", async () => {
    const historyList = vi.fn();
    const router = createAppRouter({ canAccessSubscriptionFeature: async (_userId, role, feature) => role === "admin" || feature === "utilities", listReceiptHistory: historyList });
    await expect(router.createCaller(contextFor("user")).history.list({ month: "2026-08" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(historyList).not.toHaveBeenCalled();
  });

  it("permite o preenchimento da Matriz apenas para contas PRO e mantém os dados no servidor", async () => {
    const autofill = vi.fn().mockResolvedValue({ portfolioTotal: 500_000, monthOpening: 120_000, currentOverdue: 90_000, creditGoal: 75_000, challengeGoal: 80_000, lostGoal: 4_000, lostReceived: 2_500 });
    const router = createAppRouter({ getMatrixAutofillForUser: autofill });

    dbMocks.getMySubscription.mockResolvedValue({ plan: "free", isPro: false });
    await expect(router.createCaller(contextFor("user")).metrics.autofillFromMatrix()).rejects.toMatchObject({ code: "FORBIDDEN", message: "A Matriz está disponível somente no plano PRO." });
    expect(autofill).not.toHaveBeenCalled();

    dbMocks.getMySubscription.mockResolvedValue({ plan: "pro", isPro: true });
    await expect(router.createCaller(contextFor("user")).metrics.autofillFromMatrix()).resolves.toEqual({ portfolioTotal: 500_000, monthOpening: 120_000, currentOverdue: 90_000, creditGoal: 75_000, challengeGoal: 80_000, lostGoal: 4_000, lostReceived: 2_500 });
    expect(autofill).toHaveBeenCalledWith(31);
  });

  it("mantém uma página configurada como Free disponível ao operador", async () => {
    const router = createAppRouter({ canAccessSubscriptionFeature: async (_userId, _role, feature) => feature === "utilities" });
    (dbMocks as { [key: string]: ReturnType<typeof vi.fn> }).listUtilityDownloads.mockResolvedValue([]);
    await expect(router.createCaller(contextFor("user")).utilities.downloads()).resolves.toEqual([]);
    expect(dbMocks.listUtilityDownloads).toHaveBeenCalledWith(false);
  });

  it("expõe a assinatura ao operador e limita configuração, plano e análise ao administrador", async () => {
    dbMocks.getMySubscription.mockResolvedValue({ plan: "free", isPro: false, proExpiresAt: null, settings, latestProof: null });
    dbMocks.getMercadoPagoSubscription.mockResolvedValue(null);
    dbMocks.submitSubscriptionProof.mockResolvedValue({ proofUrl: "/manus-storage/proof.png" });
    dbMocks.uploadSubscriptionPixQrCode.mockResolvedValue(settings);
    dbMocks.getSubscriptionSettings.mockResolvedValue(settings);
    dbMocks.listSubscriptionProofs.mockResolvedValue([]);
    const router = createAppRouter({ canAccessSubscriptionFeature: async () => true });
    const user = router.createCaller(contextFor("user"));
    const admin = router.createCaller(contextFor("admin"));

    await expect(user.subscription.mine()).resolves.toMatchObject({ plan: "free", isPro: false });
    await expect(user.subscription.submitProof({ dataUrl: "data:image/png;base64,aGVsbG8gaXN0byBlIHVtIGNvbXByb3ZhbnRlIHZhbGlkbyE=" })).resolves.toEqual({ proofUrl: "/manus-storage/proof.png" });
    expect(notificationMocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "Novo comprovante de assinatura" }));
    await expect(user.subscriptionAdmin.settings()).rejects.toMatchObject({ code: "FORBIDDEN" });

    await admin.subscriptionAdmin.updateSettings({ ...validSettingsInput, branchesPlan: "free", historyPlan: "pro", utilitiesPlan: "pro", chatPlan: "pro", metricsPlan: "pro" });
    await admin.subscriptionAdmin.uploadPixQrCode({ dataUrl: "data:image/png;base64,aGVsbG8gaXN0byBlIHVtIGNvbXByb3ZhbnRlIHZhbGlkbyE=" });
    await admin.subscriptionAdmin.setUserPlan({ userId: 42, plan: "pro" });
    await admin.subscriptionAdmin.reviewProof({ id: 7, status: "approved" });
    expect(dbMocks.updateSubscriptionSettings).toHaveBeenCalledWith(expect.objectContaining({ monthlyPrice: 29.9, promotionOriginalPrice: 39.9, promotionPrice: 24.9, promotionBadge: "Condição especial", promotionTitle: "PRO com valor reduzido", promotionDescription: "Garanta acesso a todos os recursos com preço promocional.", promotionBackground: "violet", promotionCtaLabel: "Assinar com desconto", planInfoTitle: "Oferta especial", planInfoDescription: "Assine para acessar os recursos avançados.", planInfoBackground: "violet", planInfoCtaEnabled: true, planInfoCtaLabel: "Conhecer os recursos", planInfoCtaUrl: "/ajuda", pixCopyPaste: "0002012636...", pixReceiverName: "MEU FIADO", pixReceiverBank: "Banco do Brasil", branchesPlan: "free", metricsPlan: "pro" }), 31);
    expect(dbMocks.uploadSubscriptionPixQrCode).toHaveBeenCalledWith(31, expect.stringContaining("data:image/png;base64,"));
    expect(dbMocks.setManagedUserPlan).toHaveBeenCalledWith(42, "pro");
    expect(dbMocks.reviewSubscriptionProof).toHaveBeenCalledWith(7, "approved", null, 31);
  });

  it("cria uma assinatura recorrente e mantém o link de checkout associado ao usuário", async () => {
    dbMocks.getMercadoPagoSubscription.mockResolvedValue(null);
    dbMocks.getSubscriptionSettings.mockResolvedValue(settings);
    mercadoPagoMocks.createRecurringPreapproval.mockResolvedValue({ id: "preapproval-1", status: "pending", init_point: "https://mp.example/checkout", next_payment_date: "2026-09-25T12:00:00.000Z" });
    dbMocks.saveMercadoPagoSubscription.mockResolvedValue({ id: 1 });

    await expect(createAppRouter().createCaller(contextFor("user")).subscription.mercadoPagoCheckout()).resolves.toEqual({ checkoutUrl: "https://mp.example/checkout", providerStatus: "pending", reused: false });
    expect(mercadoPagoMocks.createRecurringPreapproval).toHaveBeenCalledWith(expect.objectContaining({ payerEmail: "teste@example.com", monthlyPrice: 19.9, notificationUrl: "https://app.example.com/api/mercadopago/webhook?source_news=webhooks", backUrl: "https://app.example.com/plano?checkout=mercadopago" }));
    expect(dbMocks.saveMercadoPagoSubscription).toHaveBeenCalledWith(expect.objectContaining({ userId: 31, preapprovalId: "preapproval-1", checkoutUrl: "https://mp.example/checkout", amount: 19.9 }));
  });

  it("cobra o preço promocional quando a oferta está configurada", async () => {
    dbMocks.getMercadoPagoSubscription.mockResolvedValue(null);
    dbMocks.getSubscriptionSettings.mockResolvedValue({ ...settings, promotionOriginalPrice: 29.9, promotionPrice: 19.9 });
    mercadoPagoMocks.createRecurringPreapproval.mockResolvedValue({ id: "preapproval-promo", status: "pending", init_point: "https://mp.example/promo" });
    dbMocks.saveMercadoPagoSubscription.mockResolvedValue({ id: 2 });

    await expect(createAppRouter().createCaller(contextFor("user")).subscription.mercadoPagoCheckout()).resolves.toEqual({ checkoutUrl: "https://mp.example/promo", providerStatus: "pending", reused: false });
    expect(mercadoPagoMocks.createRecurringPreapproval).toHaveBeenCalledWith(expect.objectContaining({ monthlyPrice: 19.9 }));
    expect(dbMocks.saveMercadoPagoSubscription).toHaveBeenCalledWith(expect.objectContaining({ amount: 19.9 }));
  });

  it("recusa promoção inválida para proteger o preço da assinatura", async () => {
    const admin = createAppRouter({ canAccessSubscriptionFeature: async () => true }).createCaller(contextFor("admin"));
    await expect(admin.subscriptionAdmin.updateSettings({ ...validSettingsInput, promotionOriginalPrice: 19.9, promotionPrice: 24.9 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("exige os textos essenciais da promoção personalizada", async () => {
    const admin = createAppRouter({ canAccessSubscriptionFeature: async () => true }).createCaller(contextFor("admin"));
    await expect(admin.subscriptionAdmin.updateSettings({ ...validSettingsInput, promotionTitle: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(admin.subscriptionAdmin.updateSettings({ ...validSettingsInput, promotionDescription: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("exige título e texto para o card exibido no Plano", async () => {
    const admin = createAppRouter({ canAccessSubscriptionFeature: async () => true }).createCaller(contextFor("admin"));
    await expect(admin.subscriptionAdmin.updateSettings({ ...validSettingsInput, promotionOriginalPrice: 0, promotionPrice: 0, planInfoTitle: "", planInfoDescription: "Descrição válida." })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("aceita botão de chamada válido e rejeita texto ou link inválidos", async () => {
    const admin = createAppRouter({ canAccessSubscriptionFeature: async () => true }).createCaller(contextFor("admin"));
    await expect(admin.subscriptionAdmin.updateSettings({ ...validSettingsInput, planInfoCtaLabel: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(admin.subscriptionAdmin.updateSettings({ ...validSettingsInput, planInfoCtaUrl: "javascript:alert(1)" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("reutiliza um checkout pendente para não criar assinaturas recorrentes duplicadas", async () => {
    dbMocks.getMercadoPagoSubscription.mockResolvedValue({ checkoutUrl: "https://mp.example/existente", providerStatus: "pending" });
    await expect(createAppRouter().createCaller(contextFor("user")).subscription.mercadoPagoCheckout()).resolves.toEqual({ checkoutUrl: "https://mp.example/existente", providerStatus: "pending", reused: true });
    expect(mercadoPagoMocks.createRecurringPreapproval).not.toHaveBeenCalled();
  });

  it("permite ao administrador informar uma validade futura para a assinatura PRO", async () => {
    const router = createAppRouter({ canAccessSubscriptionFeature: async () => true });
    const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    await router.createCaller(contextFor("admin")).subscriptionAdmin.setUserPlan({ userId: 42, plan: "pro", proExpiresAt: expiresAt });
    expect(dbMocks.setManagedUserPlan).toHaveBeenCalledWith(42, "pro", expiresAt);
  });
});
