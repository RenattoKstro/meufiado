import { z } from "zod";
import {
  completeMyProfile,
  createRomaneioDocument,
  createReceiptHistoryEntry,
  createBranch,
  createPreRegisteredUser,
  deleteManagedUser,
  deleteReceiptHistoryEntry,
  deleteUtilityDownload,
  deleteUtilityReport,
  createUtilityDownload,
  createUtilityReport,
  countUnreadChatMessages,
  canAccessSubscriptionFeature,
  getMySubscription,
  getAppTextSettings,
  getSubscriptionSettings,
  getChatSupportAdmin,
  listChatMessages,
  listPrivateChatThreads,
  importMatrixWorkbook,
  importBranches,
  getAnalyticImportStatus,
  getMyMetrics,
  getMyProfile,
  getReceiptDailyStatus,
  getRomaneioDocumentForOwner,
  listRomaneioParties,
  listRomaneioProducts,
  listBranchOverviews,
  listMatrixOverviews,
  listActiveBranchesWithSlots,
  listAllBranches,
  listManagedUsers,
  listReceiptHistory,
  listRomaneioDocuments,
  listUtilityDownloads,
  listUtilityReports,
  saveMyMetrics,
  setBranchStatus,
  updateManagedUser,
  updateReceiptHistoryEntry,
  updateUtilityDownload,
  updateUtilityReport,
  updateAccountRole,
  updateAppTextSettings,
  updateMyAccount,
  updateMyPreferences,
  uploadMyAvatar,
  loginLocalAdmin,
  updateLocalAdminCredentials,
  loginGoogleOperator,
  markChatMessagesRead,
  sendChatMessage,
  listSubscriptionProofs,
  reviewSubscriptionProof,
  setManagedUserPlan,
  getSharedRomaneioDocument,
  saveRomaneioPdf,
  signSharedRomaneioDocument,
  submitSubscriptionProof,
  uploadSubscriptionPixQrCode,
  updateSubscriptionSettings,
  getMercadoPagoSubscription,
  saveMercadoPagoSubscription,
} from "./db";
import { createRecurringPreapproval } from "./mercadoPago";
import { randomUUID } from "crypto";
import { getSessionCookieOptions } from "./_core/cookies";
import { ADMIN_SESSION_COOKIE, createAdminSession, createUserSession, USER_SESSION_COOKIE } from "./localAdminAuth";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import {
  analyticRowFromSpreadsheet,
  branchRowFromSpreadsheet,
  challengeDailyRowFromSpreadsheet,
  dailyTrackingRowFromSpreadsheet,
  dataRowFromSpreadsheet,
  receiptDailyRowFromSpreadsheet,
  uniqueRowsByBranchCode,
} from "../shared/importRules";
import { OAuth2Client } from "google-auth-library";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";

const operatorType = z.enum(["leader", "assistant"]);
const palette = z.enum(["ocean", "violet", "forest", "sunset", "rose", "midnight", "citrus", "slate"]);
const nonNegativeNumber = z.number().min(0).finite();
const profileInput = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  branchId: z.number().int().positive(),
  phone: z.string().trim().min(8).max(32),
  instagram: z.string().trim().max(120).optional().nullable(),
  operatorType,
});
const metricsInput = z.object({
  portfolioTotal: nonNegativeNumber,
  monthOpening: nonNegativeNumber,
  dayOpening: nonNegativeNumber,
  currentOverdue: nonNegativeNumber,
  creditGoal: nonNegativeNumber,
  challengeGoal: nonNegativeNumber,
  lostGoal: nonNegativeNumber,
  lostReceived: nonNegativeNumber,
  workingDaysMode: z.enum(["automatic", "manual"]).default("automatic"),
  workingDaysTotal: z.number().int().min(0).max(31),
  workingDaysElapsed: z.number().int().min(0).max(31),
  ticketWorkingDaysRemaining: z.number().int().min(0).max(31),
  fiadoAtDay15: z.boolean(),
});
const spreadsheetRow = z.array(z.union([z.string(), z.number(), z.null(), z.undefined()]));
const matrixWorkbookInput = z.object({
  analytic: z.array(spreadsheetRow).max(5000).default([]),
  data: z.array(spreadsheetRow).max(5000).default([]),
  dailyTracking: z.array(spreadsheetRow).max(5000).default([]),
  challengeDaily: z.array(spreadsheetRow).max(5000).default([]),
  receiptDaily: z.array(spreadsheetRow).max(5000).default([]),
}).refine(value => value.analytic.length + value.data.length + value.dailyTracking.length + value.challengeDaily.length + value.receiptDaily.length > 0, {
  message: "Envie ao menos uma das planilhas da Matriz.",
});
const utilityDownloadInput = z.object({
  title: z.string().trim().min(2).max(180),
  fileType: z.string().trim().min(2).max(32),
  externalUrl: z.string().trim().url().max(2048),
  isPinned: z.boolean(),
  isVisible: z.boolean(),
});
const utilityReportInput = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().min(2).max(10_000),
  isVisible: z.boolean(),
});
const accountInput = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(8).max(32),
  instagram: z.string().trim().max(120).optional().nullable(),
});
const avatarInput = z.object({ dataUrl: z.string().min(32).max(3_000_000) });
const historyMonthInput = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });
const historyEntryInput = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  receivedAmount: nonNegativeNumber,
});
const subscriptionPlan = z.enum(["free", "pro"]);
const subscriptionSettingsInput = z.object({
  monthlyPrice: z.number().min(0).max(100_000).finite(),
  pixKey: z.string().trim().max(255),
  pixCopyPaste: z.string().trim().max(2048),
  pixReceiverName: z.string().trim().min(2).max(25),
  pixReceiverBank: z.string().trim().max(80),
  branchesPlan: subscriptionPlan,
  historyPlan: subscriptionPlan,
  utilitiesPlan: subscriptionPlan,
  chatPlan: subscriptionPlan,
});
const proofInput = z.object({ dataUrl: z.string().min(32).max(4_500_000) });
const appTextSettingsInput = z.object({
  appName: z.string().trim().min(2).max(100),
  slogan: z.string().trim().min(2).max(240),
  welcomeTitle: z.string().trim().min(2).max(180),
  welcomeDescription: z.string().trim().min(2).max(600),
  overviewTitle: z.string().trim().min(2).max(120),
  overviewDescription: z.string().trim().min(2).max(240),
  utilitiesTitle: z.string().trim().min(2).max(120),
  utilitiesDescription: z.string().trim().min(2).max(240),
  subscriptionTitle: z.string().trim().min(2).max(120),
  subscriptionDescription: z.string().trim().min(2).max(240),
  navOverview: z.string().trim().min(2).max(80),
  navBranches: z.string().trim().min(2).max(80),
  navHistory: z.string().trim().min(2).max(80),
  navUtilities: z.string().trim().min(2).max(80),
  navChat: z.string().trim().min(2).max(80),
  navSettings: z.string().trim().min(2).max(80),
  navPreferences: z.string().trim().min(2).max(80),
  navAccount: z.string().trim().min(2).max(80),
});
const romaneioPartyInput = z.object({
  name: z.string().trim().min(2).max(180),
  branch: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  neighborhood: z.string().trim().max(120).optional().nullable(),
});
const romaneioInput = z.object({
  invoiceNumber: z.string().trim().min(1, "Informe a Nota Fiscal.").max(80),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requesting: romaneioPartyInput,
  providing: romaneioPartyInput,
  items: z.array(z.object({
    productCode: z.string().trim().min(1).max(80),
    productName: z.string().trim().min(2).max(255),
    unit: z.string().trim().max(24).optional().nullable(),
  })).min(1).max(100),
});
const googleClient = new OAuth2Client();

function getGoogleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Login Google não está configurado.");
  return clientId;
}

type RouterDependencies = {
  loginGoogleOperator?: typeof loginGoogleOperator;
  getMyProfile?: typeof getMyProfile;
  listActiveBranchesWithSlots?: typeof listActiveBranchesWithSlots;
  completeMyProfile?: typeof completeMyProfile;
  getMyMetrics?: typeof getMyMetrics;
  saveMyMetrics?: typeof saveMyMetrics;
  listReceiptHistory?: typeof listReceiptHistory;
  getReceiptDailyStatus?: typeof getReceiptDailyStatus;
  createReceiptHistoryEntry?: typeof createReceiptHistoryEntry;
  updateReceiptHistoryEntry?: typeof updateReceiptHistoryEntry;
  deleteReceiptHistoryEntry?: typeof deleteReceiptHistoryEntry;
  canAccessSubscriptionFeature?: typeof canAccessSubscriptionFeature;
  getMySubscription?: typeof getMySubscription;
  getAppTextSettings?: typeof getAppTextSettings;
  updateAppTextSettings?: typeof updateAppTextSettings;
};

export function createAppRouter(dependencies: RouterDependencies = {}) {
  const resolveGoogleOperator = dependencies.loginGoogleOperator ?? loginGoogleOperator;
  const resolveMyProfile = dependencies.getMyProfile ?? getMyProfile;
  const resolveBranchesWithSlots = dependencies.listActiveBranchesWithSlots ?? listActiveBranchesWithSlots;
  const resolveProfileCompletion = dependencies.completeMyProfile ?? completeMyProfile;
  const resolveMetrics = dependencies.getMyMetrics ?? getMyMetrics;
  const resolveMetricsSave = dependencies.saveMyMetrics ?? saveMyMetrics;
  const resolveHistoryList = dependencies.listReceiptHistory ?? listReceiptHistory;
  const resolveDailyReceiptStatus = dependencies.getReceiptDailyStatus ?? getReceiptDailyStatus;
  const resolveHistoryCreate = dependencies.createReceiptHistoryEntry ?? createReceiptHistoryEntry;
  const resolveHistoryUpdate = dependencies.updateReceiptHistoryEntry ?? updateReceiptHistoryEntry;
  const resolveHistoryDelete = dependencies.deleteReceiptHistoryEntry ?? deleteReceiptHistoryEntry;
  const resolveFeatureAccess = dependencies.canAccessSubscriptionFeature ?? canAccessSubscriptionFeature;
  const resolveSubscription = dependencies.getMySubscription ?? getMySubscription;
  const resolveAppTexts = dependencies.getAppTextSettings ?? getAppTextSettings;
  const resolveAppTextsUpdate = dependencies.updateAppTextSettings ?? updateAppTextSettings;

  async function requireFeatureAccess(userId: number, role: "admin" | "user", feature: "branches" | "history" | "utilities" | "chat") {
    if (await resolveFeatureAccess(userId, role, feature)) return;
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta página está disponível no plano PRO." });
  }

  async function requireRomaneioProAccess(userId: number, role: "admin" | "user") {
    if (role === "admin" || (await resolveSubscription(userId)).isPro) return;
    throw new TRPCError({ code: "FORBIDDEN", message: "O Romaneio está disponível somente no plano PRO." });
  }

  async function requireMatrixProAccess(userId: number, role: "admin" | "user") {
    if (role === "admin" || (await resolveSubscription(userId)).isPro) return;
    throw new TRPCError({ code: "FORBIDDEN", message: "A Matriz está disponível somente no plano PRO." });
  }

  return router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      ctx.res.clearCookie(USER_SESSION_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  appTexts: router({
    get: publicProcedure.query(() => resolveAppTexts()),
    update: adminProcedure.input(appTextSettingsInput).mutation(({ input }) => resolveAppTextsUpdate(input)),
  }),
  adminAuth: router({
    login: publicProcedure.input(z.object({ username: z.string().trim().min(1).max(80), password: z.string().min(1).max(256) })).mutation(async ({ ctx, input }) => {
      const user = await loginLocalAdmin(input.username, input.password);
      if (!user) return { success: false } as const;
      const token = await createAdminSession(user.id);
      ctx.res.cookie(ADMIN_SESSION_COOKIE, token, { ...getSessionCookieOptions(ctx.req), maxAge: 12 * 60 * 60 * 1000 });
      return { success: true } as const;
    }),
    updateCredentials: adminProcedure.input(z.object({ username: z.string().trim().min(3).max(80), newPassword: z.string().min(8).max(256).optional() })).mutation(({ input }) => updateLocalAdminCredentials(input)),
  }),
  googleAuth: router({
    config: publicProcedure.query(() => ({ clientId: getGoogleClientId() })),
    login: publicProcedure.input(z.object({ credential: z.string().min(20).max(8192), mode: z.enum(["login", "register"]) })).mutation(async ({ ctx, input }) => {
      try {
        const ticket = await googleClient.verifyIdToken({ idToken: input.credential, audience: getGoogleClientId() });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email || !payload.email_verified) return { success: false } as const;
        const user = await resolveGoogleOperator(
          { subject: payload.sub, email: payload.email, name: payload.name },
          undefined,
          { createIfMissing: input.mode === "register" },
        );
        if (!user) return { success: false, reason: "not_registered" } as const;
        const token = await createUserSession(user.id);
        ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
        ctx.res.cookie(USER_SESSION_COOKIE, token, { ...getSessionCookieOptions(ctx.req), maxAge: 12 * 60 * 60 * 1000 });
        return { success: true } as const;
      } catch {
        return { success: false } as const;
      }
    }),
  }),
  profile: router({
    mine: protectedProcedure.query(async ({ ctx }) => (await resolveMyProfile(ctx.user.id)) ?? null),
    branches: protectedProcedure.query(() => resolveBranchesWithSlots()),
    complete: protectedProcedure.input(profileInput).mutation(({ ctx, input }) => resolveProfileCompletion(ctx.user.id, input)),
    account: protectedProcedure.input(accountInput).mutation(({ ctx, input }) => updateMyAccount(ctx.user.id, input)),
    uploadAvatar: protectedProcedure.input(avatarInput).mutation(({ ctx, input }) => uploadMyAvatar(ctx.user.id, input.dataUrl)),
    preferences: protectedProcedure
      .input(z.object({ colorMode: z.enum(["light", "dark"]).optional(), colorPalette: palette.optional(), showLostGoal: z.boolean().optional(), isOnVacation: z.boolean().optional() }))
      .mutation(({ ctx, input }) => updateMyPreferences(ctx.user.id, input)),
  }),
  metrics: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const profile = await resolveMyProfile(ctx.user.id);
      if (ctx.user.role === "admin" && !profile?.profile?.branchId) return null;
      return resolveMetrics(ctx.user.id);
    }),
    save: protectedProcedure.input(metricsInput).mutation(async ({ ctx, input }) => {
      const profile = await resolveMyProfile(ctx.user.id);
      if (ctx.user.role === "admin" && !profile?.profile?.branchId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Administradores sem filial não podem alterar métricas operacionais." });
      }
      return resolveMetricsSave(ctx.user.id, input);
    }),
  }),
  branches: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      await requireFeatureAccess(ctx.user.id, ctx.user.role, "branches");
      return listBranchOverviews();
    }),
  }),
  matrix: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      await requireMatrixProAccess(ctx.user.id, ctx.user.role);
      return listMatrixOverviews();
    }),
    importStatus: protectedProcedure.query(async ({ ctx }) => {
      await requireMatrixProAccess(ctx.user.id, ctx.user.role);
      return getAnalyticImportStatus();
    }),
  }),
  history: router({
    list: protectedProcedure.input(historyMonthInput).query(async ({ ctx, input }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "history"); return resolveHistoryList(ctx.user.id, input.month); }),
    dailyStatus: protectedProcedure.input(z.object({ entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).query(({ ctx, input }) => resolveDailyReceiptStatus(ctx.user.id, input.entryDate)),
    create: protectedProcedure.input(historyEntryInput).mutation(async ({ ctx, input }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "history"); return resolveHistoryCreate(ctx.user.id, input); }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: historyEntryInput })).mutation(async ({ ctx, input }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "history"); return resolveHistoryUpdate(ctx.user.id, input.id, input.data); }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "history"); return resolveHistoryDelete(ctx.user.id, input.id); }),
  }),
  admin: router({
    users: adminProcedure.query(() => listManagedUsers()),
    branches: adminProcedure.query(() => listAllBranches()),
    createBranch: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120), code: z.string().trim().max(32).optional() })).mutation(({ input }) => createBranch(input)),
    importBranches: adminProcedure.input(z.object({ rows: z.array(spreadsheetRow).min(1).max(5000) })).mutation(({ input }) => {
      const parsedRows = input.rows.map(branchRowFromSpreadsheet).filter((row): row is NonNullable<typeof row> => row !== null);
      const rows = uniqueRowsByBranchCode(parsedRows);
      return importBranches(rows).then(result => ({ ...result, received: input.rows.length, valid: parsedRows.length, skipped: input.rows.length - rows.length }));
    }),
    importAnalytics: adminProcedure.input(matrixWorkbookInput).mutation(({ input }) => {
      const parseRows = <T extends { code: string }>(rows: (string | number | null | undefined)[][], parser: (row: unknown[]) => T | null) => {
        const parsed = rows.map(parser).filter((row): row is T => row !== null);
        return uniqueRowsByBranchCode(parsed);
      };
      const analytic = parseRows(input.analytic, analyticRowFromSpreadsheet);
      const data = parseRows(input.data, dataRowFromSpreadsheet);
      const dailyTracking = parseRows(input.dailyTracking, dailyTrackingRowFromSpreadsheet);
      const challengeDaily = parseRows(input.challengeDaily, challengeDailyRowFromSpreadsheet);
      const receiptDaily = parseRows(input.receiptDaily, receiptDailyRowFromSpreadsheet);
      return importMatrixWorkbook({
        analytic,
        data,
        dailyTracking,
        challengeDaily,
        receiptDaily,
        sourceRows: {
          analytic: { receivedRows: input.analytic.length, validRows: analytic.length },
          data: { receivedRows: input.data.length, validRows: data.length },
          dailyTracking: { receivedRows: input.dailyTracking.length, validRows: dailyTracking.length },
          challengeDaily: { receivedRows: input.challengeDaily.length, validRows: challengeDaily.length },
          receiptDaily: { receivedRows: input.receiptDaily.length, validRows: receiptDaily.length },
        },
      }).then(result => ({
        ...result,
        received: input.analytic.length + input.data.length + input.dailyTracking.length + input.challengeDaily.length + input.receiptDaily.length,
        valid: analytic.length + data.length + dailyTracking.length + challengeDaily.length + receiptDaily.length,
      }));
    }),
    importStatus: adminProcedure.query(() => getAnalyticImportStatus()),
    setBranchStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(({ input }) => setBranchStatus(input.id, input.isActive)),
    preRegister: adminProcedure.input(profileInput).mutation(({ input }) => createPreRegisteredUser(input)),
    updateUser: adminProcedure
      .input(z.object({ id: z.number().int().positive(), isActive: z.boolean().optional(), isOnVacation: z.boolean().optional(), operatorType: operatorType.optional(), branchId: z.number().int().positive().optional() }))
      .mutation(({ input }) => {
        const { id, ...changes } = input;
        return updateManagedUser(id, changes);
      }),
    updateRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["admin", "user"]) })).mutation(({ input }) => updateAccountRole(input.userId, input.role)),
    deleteUser: adminProcedure.input(z.object({ profileId: z.number().int().positive() })).mutation(({ ctx, input }) => deleteManagedUser(input.profileId, ctx.user.id)),
  }),
  chat: router({
    general: protectedProcedure.query(async ({ ctx }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "chat"); return listChatMessages(ctx.user.id); }),
    private: protectedProcedure.input(z.object({ recipientUserId: z.number().int().positive() })).query(async ({ ctx, input }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "chat"); return listChatMessages(ctx.user.id, input.recipientUserId); }),
    privateThreads: protectedProcedure.query(async ({ ctx }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "chat"); return listPrivateChatThreads(ctx.user.id); }),
    supportRecipient: protectedProcedure.query(async ({ ctx }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "chat"); return getChatSupportAdmin(ctx.user.id); }),
    send: protectedProcedure.input(z.object({ body: z.string().trim().min(1).max(1200), recipientUserId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "chat"); return sendChatMessage({ senderUserId: ctx.user.id, recipientUserId: input.recipientUserId, body: input.body }); }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "chat"); return countUnreadChatMessages(ctx.user.id); }),
    markRead: protectedProcedure.mutation(async ({ ctx }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "chat"); return markChatMessagesRead(ctx.user.id); }),
  }),
  utilities: router({
    downloads: protectedProcedure.query(async ({ ctx }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "utilities"); return listUtilityDownloads(ctx.user.role === "admin"); }),
    reports: protectedProcedure.query(async ({ ctx }) => { await requireFeatureAccess(ctx.user.id, ctx.user.role, "utilities"); return listUtilityReports(ctx.user.role === "admin"); }),
  }),
  romaneio: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await requireRomaneioProAccess(ctx.user.id, ctx.user.role);
      return listRomaneioDocuments(ctx.user.id);
    }),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await requireRomaneioProAccess(ctx.user.id, ctx.user.role);
      return getRomaneioDocumentForOwner(ctx.user.id, input.id);
    }),
    create: protectedProcedure.input(romaneioInput).mutation(async ({ ctx, input }) => {
      await requireRomaneioProAccess(ctx.user.id, ctx.user.role);
      return createRomaneioDocument(ctx.user.id, input);
    }),
    parties: protectedProcedure.query(async ({ ctx }) => {
      await requireRomaneioProAccess(ctx.user.id, ctx.user.role);
      return listRomaneioParties();
    }),
    products: protectedProcedure.query(async ({ ctx }) => {
      await requireRomaneioProAccess(ctx.user.id, ctx.user.role);
      return listRomaneioProducts();
    }),
    savePdf: protectedProcedure.input(z.object({ id: z.number().int().positive(), pdfDataUrl: z.string().min(64).max(7_000_000) })).mutation(async ({ ctx, input }) => {
      await requireRomaneioProAccess(ctx.user.id, ctx.user.role);
      return saveRomaneioPdf(ctx.user.id, input.id, input.pdfDataUrl);
    }),
    shared: publicProcedure.input(z.object({ token: z.string().regex(/^[a-f0-9]{32}$/) })).query(({ input }) => getSharedRomaneioDocument(input.token)),
    sign: publicProcedure.input(z.object({ token: z.string().regex(/^[a-f0-9]{32}$/), signer: z.enum(["origin", "destination"]), signatureDataUrl: z.string().min(32).max(1_500_000), signatureStyle: z.enum(["classica", "manuscrita", "elegante", "simples", "manual"]) })).mutation(({ input }) => signSharedRomaneioDocument(input.token, input.signer, input.signatureDataUrl, input.signatureStyle)),
  }),
  subscription: router({
    mine: protectedProcedure.query(async ({ ctx }) => ({
      ...(await getMySubscription(ctx.user.id)),
      mercadoPagoSubscription: await getMercadoPagoSubscription(ctx.user.id),
    })),
    mercadoPagoCheckout: protectedProcedure.mutation(async ({ ctx }) => {
      const existing = await getMercadoPagoSubscription(ctx.user.id);
      if (existing?.checkoutUrl && ["pending", "authorized"].includes(existing.providerStatus)) {
        return { checkoutUrl: existing.checkoutUrl, providerStatus: existing.providerStatus, reused: true };
      }
      const settings = await getSubscriptionSettings();
      if (!settings.monthlyPrice || settings.monthlyPrice <= 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A mensalidade PRO ainda não foi configurada pela administração." });
      if (!ctx.user.email) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Seu cadastro precisa ter um e-mail para iniciar o pagamento." });
      const forwardedHost = ctx.req.header("x-forwarded-host")?.split(",")[0]?.trim();
      const host = forwardedHost || ctx.req.header("host");
      if (!host) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível preparar o retorno do pagamento." });
      const protocol = ctx.req.header("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
      const appUrl = `${protocol}://${host}`;
      const externalReference = `mf-pro-${ctx.user.id}-${randomUUID()}`;
      const preapproval = await createRecurringPreapproval({
        payerEmail: ctx.user.email,
        externalReference,
        monthlyPrice: settings.monthlyPrice,
        notificationUrl: `${appUrl}/api/mercadopago/webhook?source_news=webhooks`,
        backUrl: `${appUrl}/plano?checkout=mercadopago`,
      });
      const checkoutUrl = preapproval.init_point ?? preapproval.sandbox_init_point ?? null;
      if (!checkoutUrl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "O Mercado Pago não retornou o link de pagamento." });
      await saveMercadoPagoSubscription({
        userId: ctx.user.id,
        externalReference,
        preapprovalId: preapproval.id,
        checkoutUrl,
        providerStatus: preapproval.status,
        amount: settings.monthlyPrice,
        nextPaymentDate: preapproval.next_payment_date ? new Date(preapproval.next_payment_date) : null,
      });
      return { checkoutUrl, providerStatus: preapproval.status, reused: false };
    }),
    submitProof: protectedProcedure.input(proofInput).mutation(async ({ ctx, input }) => {
      const proof = await submitSubscriptionProof(ctx.user.id, input.dataUrl);
      await notifyOwner({
        title: "Novo comprovante de assinatura",
        content: `${ctx.user.name || "Um operador"} enviou um comprovante. Acesse Administração > Assinaturas para analisar e liberar o acesso PRO.`,
      });
      return proof;
    }),
  }),
  subscriptionAdmin: router({
    settings: adminProcedure.query(() => getSubscriptionSettings()),
    updateSettings: adminProcedure.input(subscriptionSettingsInput).mutation(({ ctx, input }) => updateSubscriptionSettings(input, ctx.user.id)),
    uploadPixQrCode: adminProcedure.input(z.object({ dataUrl: z.string().min(32).max(3_000_000) })).mutation(({ ctx, input }) => uploadSubscriptionPixQrCode(ctx.user.id, input.dataUrl)),
    setUserPlan: adminProcedure.input(z.object({ userId: z.number().int().positive(), plan: subscriptionPlan, proExpiresAt: z.coerce.date().optional().nullable() }).superRefine((input, context) => {
      if (input.plan === "pro" && input.proExpiresAt && input.proExpiresAt.getTime() <= Date.now()) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["proExpiresAt"], message: "A validade PRO precisa estar no futuro." });
      }
    })).mutation(({ input }) => input.proExpiresAt ? setManagedUserPlan(input.userId, input.plan, input.proExpiresAt) : setManagedUserPlan(input.userId, input.plan)),
    proofs: adminProcedure.query(() => listSubscriptionProofs()),
    reviewProof: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "rejected"]), reviewNote: z.string().trim().max(600).optional().nullable() })).mutation(({ ctx, input }) => reviewSubscriptionProof(input.id, input.status, input.reviewNote ?? null, ctx.user.id)),
  }),
  utilityAdmin: router({
    createDownload: adminProcedure.input(utilityDownloadInput).mutation(({ ctx, input }) => createUtilityDownload(input, ctx.user.id)),
    updateDownload: adminProcedure.input(z.object({ id: z.number().int().positive(), data: utilityDownloadInput })).mutation(({ input }) => updateUtilityDownload(input.id, input.data)),
    deleteDownload: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteUtilityDownload(input.id)),
    createReport: adminProcedure.input(utilityReportInput).mutation(({ ctx, input }) => createUtilityReport(input, ctx.user.id)),
    updateReport: adminProcedure.input(z.object({ id: z.number().int().positive(), data: utilityReportInput })).mutation(({ input }) => updateUtilityReport(input.id, input.data)),
    deleteReport: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteUtilityReport(input.id)),
  }),
  });
}

export const appRouter = createAppRouter();

export type AppRouter = typeof appRouter;
