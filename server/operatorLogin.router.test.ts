import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getUserSessionUserId, USER_SESSION_COOKIE } from "./localAdminAuth";

const loginGoogleOperatorMock = vi.hoisted(() => vi.fn());
const verifyIdTokenMock = vi.hoisted(() => vi.fn());

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  loginGoogleOperator: loginGoogleOperatorMock,
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdTokenMock;
  },
}));

import { appRouter } from "./routers";

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

describe("googleAuth.login", () => {
  beforeEach(() => {
    loginGoogleOperatorMock.mockReset();
    verifyIdTokenMock.mockReset();
    process.env.JWT_SECRET = "segredo-de-teste-do-operador";
    process.env.GOOGLE_CLIENT_ID = "123456789012-abcdefghijklmnopqrstuv.apps.googleusercontent.com";
  });

  it("valida o ID token do Google e cria somente a sessão interna do aplicativo", async () => {
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => ({ sub: "google-sub-31", email: "operador@loja.com", email_verified: true, name: "Operador Google" }) });
    loginGoogleOperatorMock.mockResolvedValue({ id: 31 });
    const { ctx, cookies } = createPublicContext();

    const result = await appRouter.createCaller(ctx).googleAuth.login({ credential: "token-google-com-tamanho-valido-para-teste" });

    expect(result).toEqual({ success: true });
    expect(verifyIdTokenMock).toHaveBeenCalledWith({ idToken: "token-google-com-tamanho-valido-para-teste", audience: process.env.GOOGLE_CLIENT_ID });
    expect(loginGoogleOperatorMock).toHaveBeenCalledWith({ subject: "google-sub-31", email: "operador@loja.com", name: "Operador Google" });
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(USER_SESSION_COOKIE);
    expect(cookies[0]?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 12 * 60 * 60 * 1000 });
    await expect(getUserSessionUserId(cookies[0]?.value ?? "")).resolves.toBe(31);
  });

  it("não cria sessão quando o token não é validado pelo Google", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("token inválido"));
    const { ctx, cookies } = createPublicContext();

    await expect(appRouter.createCaller(ctx).googleAuth.login({ credential: "token-google-invalido-com-tamanho-valido" })).resolves.toEqual({ success: false });
    expect(cookies).toHaveLength(0);
  });
});
