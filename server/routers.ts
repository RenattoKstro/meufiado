import { z } from "zod";
import {
  completeMyProfile,
  createBranch,
  createPreRegisteredUser,
  getMyMetrics,
  getMyProfile,
  listActiveBranches,
  listAllBranches,
  listManagedUsers,
  saveMyMetrics,
  setBranchStatus,
  updateManagedUser,
  updateAccountRole,
  updateMyPreferences,
  loginLocalAdmin,
  updateLocalAdminCredentials,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ADMIN_SESSION_COOKIE, createAdminSession } from "./localAdminAuth";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";

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
  fiadoAtDay15: z.boolean(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
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
  profile: router({
    mine: protectedProcedure.query(({ ctx }) => getMyProfile(ctx.user.id)),
    branches: protectedProcedure.query(() => listActiveBranches()),
    complete: protectedProcedure.input(profileInput).mutation(({ ctx, input }) => completeMyProfile(ctx.user.id, input)),
    preferences: protectedProcedure
      .input(z.object({ colorMode: z.enum(["light", "dark"]).optional(), colorPalette: palette.optional(), showLostGoal: z.boolean().optional(), isOnVacation: z.boolean().optional() }))
      .mutation(({ ctx, input }) => updateMyPreferences(ctx.user.id, input)),
  }),
  metrics: router({
    mine: protectedProcedure.query(({ ctx }) => getMyMetrics(ctx.user.id)),
    save: protectedProcedure.input(metricsInput).mutation(({ ctx, input }) => saveMyMetrics(ctx.user.id, input)),
  }),
  admin: router({
    users: adminProcedure.query(() => listManagedUsers()),
    branches: adminProcedure.query(() => listAllBranches()),
    createBranch: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120), code: z.string().trim().max(32).optional() })).mutation(({ input }) => createBranch(input)),
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

export type AppRouter = typeof appRouter;
