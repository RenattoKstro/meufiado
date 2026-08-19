import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getUserSessionUserId, USER_SESSION_COOKIE } from "./localAdminAuth";
import { getMyProfile, loginGoogleOperator } from "./db";

const verifyIdTokenMock = vi.hoisted(() => vi.fn());

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdTokenMock;
  },
}));

import { appRouter, createAppRouter } from "./routers";

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

function createPublicContext() {
  const cookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }),
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
  return { ctx, cookies };
}

function createRegistrationDatabase() {
  const users: Array<Record<string, unknown>> = [];
  const profiles: Array<Record<string, unknown>> = [];
  let simpleSelects = 0;
  const database = {
    select: (selection?: unknown) => ({
      from: () => {
        if (selection) {
          return { leftJoin: () => ({ where: () => ({ limit: async () => profiles.length ? [{ profile: profiles[0], branch: null }] : [] }) }) };
        }
        return {
          where: () => ({
            limit: async () => {
              simpleSelects += 1;
              return simpleSelects < 3 ? [] : users;
            },
          }),
        };
      },
    }),
    insert: () => ({
      values: async (value: Record<string, unknown>) => {
        if ("openId" in value) users.push({ id: 31, ...value });
        else profiles.push({ id: 401, branchId: null, phone: null, ...value });
      },
    }),
  };
  return { database, users, profiles };
}

describe("googleAuth.login", () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset();
    process.env.JWT_SECRET = "segredo-de-teste-do-operador";
    process.env.GOOGLE_CLIENT_ID = "123456789012-abcdefghijklmnopqrstuv.apps.googleusercontent.com";
  });

  it("valida o ID token do Google e cria sessão para o primeiro acesso, mesmo antes do perfil estar completo", async () => {
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => ({ sub: "google-sub-31", email: "operador@loja.com", email_verified: true, name: "Operador Google" }) });
    const persistence = createRegistrationDatabase();
    const testRouter = createAppRouter({
      loginGoogleOperator: (input, _database, options) => loginGoogleOperator(input, persistence.database as never, options),
      getMyProfile: userId => getMyProfile(userId, persistence.database as never),
    });
    const { ctx, cookies } = createPublicContext();

    const result = await testRouter.createCaller(ctx).googleAuth.login({ credential: "token-google-com-tamanho-valido-para-teste", mode: "register" });

    expect(result).toEqual({ success: true });
    expect(verifyIdTokenMock).toHaveBeenCalledWith({ idToken: "token-google-com-tamanho-valido-para-teste", audience: process.env.GOOGLE_CLIENT_ID });
    expect(persistence.users).toEqual([expect.objectContaining({ id: 31, openId: "google-google-sub-31", loginMethod: "google", role: "user" })]);
    expect(persistence.profiles).toEqual([expect.objectContaining({ userId: 31, branchId: null, phone: null, profileComplete: false, isActive: true })]);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(USER_SESSION_COOKIE);
    expect(cookies[0]?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 12 * 60 * 60 * 1000 });
    await expect(getUserSessionUserId(cookies[0]?.value ?? "")).resolves.toBe(31);

    const profileCaller = testRouter.createCaller({ ...ctx, user: persistence.users[0] as TrpcContext["user"] });
    await expect(profileCaller.profile.mine()).resolves.toEqual({ profile: persistence.profiles[0], branch: null });
  });

  it("não cria sessão quando o token não é validado pelo Google", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("token inválido"));
    const { ctx, cookies } = createPublicContext();

    await expect(appRouter.createCaller(ctx).googleAuth.login({ credential: "token-google-invalido-com-tamanho-valido", mode: "login" })).resolves.toEqual({ success: false });
    expect(cookies).toHaveLength(0);
  });
});
