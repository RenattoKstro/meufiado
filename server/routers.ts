import { z } from "zod";
import {
  completeMyProfile,
  createBranch,
  createPreRegisteredUser,
  importAnalyticMetrics,
  importBranches,
  getMyMetrics,
  getMyProfile,
  listBranchOverviews,
  listActiveBranchesWithSlots,
  listAllBranches,
  listManagedUsers,
  saveMyMetrics,
  setBranchStatus,
  updateManagedUser,
  updateAccountRole,
  updateMyPreferences,
  loginLocalAdmin,
  updateLocalAdminCredentials,
  loginGoogleOperator,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ADMIN_SESSION_COOKIE, createAdminSession, createUserSession, USER_SESSION_COOKIE } from "./localAdminAuth";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import { analyticRowFromSpreadsheet, branchRowFromSpreadsheet, uniqueRowsByBranchCode } from "../shared/importRules";
import { OAuth2Client } from "google-auth-library";

const operatorType = z.enum(["leader", "assistant"]);
const palette = z.enum(["ocean", "violet", "forest", "sunset"]);
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
  workingDaysTotal: z.number().int().min(0).max(31),
  workingDaysElapsed: z.number().int().min(0).max(31),
  ticketWorkingDaysRemaining: z.number().int().min(0).max(31),
  fiadoAtDay15: z.boolean(),
});
const spreadsheetRow = z.array(z.union([z.string(), z.number(), z.null(), z.undefined()]));
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
};

export function createAppRouter(dependencies: RouterDependencies = {}) {
  const resolveGoogleOperator = dependencies.loginGoogleOperator ?? loginGoogleOperator;
  const resolveMyProfile = dependencies.getMyProfile ?? getMyProfile;
  const resolveBranchesWithSlots = dependencies.listActiveBranchesWithSlots ?? listActiveBranchesWithSlots;
  const resolveProfileCompletion = dependencies.completeMyProfile ?? completeMyProfile;
  const resolveMetrics = dependencies.getMyMetrics ?? getMyMetrics;
  const resolveMetricsSave = dependencies.saveMyMetrics ?? saveMyMetrics;

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
    preferences: protectedProcedure
      .input(z.object({ colorMode: z.enum(["light", "dark"]).optional(), colorPalette: palette.optional(), showLostGoal: z.boolean().optional(), isOnVacation: z.boolean().optional() }))
      .mutation(({ ctx, input }) => updateMyPreferences(ctx.user.id, input)),
  }),
  metrics: router({
    mine: protectedProcedure.query(({ ctx }) => resolveMetrics(ctx.user.id)),
    save: protectedProcedure.input(metricsInput).mutation(({ ctx, input }) => resolveMetricsSave(ctx.user.id, input)),
  }),
  branches: router({
    overview: protectedProcedure.query(() => listBranchOverviews()),
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
    importAnalytics: adminProcedure.input(z.object({ rows: z.array(spreadsheetRow).min(1).max(5000) })).mutation(({ input }) => {
      const parsedRows = input.rows.map(analyticRowFromSpreadsheet).filter((row): row is NonNullable<typeof row> => row !== null);
      const rows = uniqueRowsByBranchCode(parsedRows);
      return importAnalyticMetrics(rows).then(result => ({ ...result, received: input.rows.length, valid: parsedRows.length, skipped: input.rows.length - rows.length }));
    }),
    setBranchStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(({ input }) => setBranchStatus(input.id, input.isActive)),
    preRegister: adminProcedure.input(profileInput).mutation(({ input }) => createPreRegisteredUser(input)),
    updateUser: adminProcedure
      .input(z.object({ id: z.number().int().positive(), isActive: z.boolean().optional(), isOnVacation: z.boolean().optional(), operatorType: operatorType.optional(), branchId: z.number().int().positive().optional() }))
      .mutation(({ input }) => {
        const { id, ...changes } = input;
        return updateManagedUser(id, changes);
      }),
    updateRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["admin", "user"]) })).mutation(({ input }) => updateAccountRole(input.userId, input.role)),
  }),
  });
}

export const appRouter = createAppRouter();

export type AppRouter = typeof appRouter;
