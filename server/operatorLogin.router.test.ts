import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getUserSessionUserId, USER_SESSION_COOKIE } from "./localAdminAuth";

const loginLocalUserMock = vi.hoisted(() => vi.fn());

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  loginLocalUser: loginLocalUserMock,
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
    } as TrpcContext["res"],
  };
  return { ctx, cookies };
}

describe("userAuth.login", () => {
  beforeEach(() => {
    loginLocalUserMock.mockReset();
    process.env.JWT_SECRET = "segredo-de-teste-do-operador";
  });

  it("mantém o login local do operador por e-mail e senha após a inclusão do Google", async () => {
    loginLocalUserMock.mockResolvedValue({ id: 31 });
    const { ctx, cookies } = createPublicContext();

    const result = await appRouter.createCaller(ctx).userAuth.login({ email: "operador@loja.com", password: "senha-local-123" });

    expect(result).toEqual({ success: true });
    expect(loginLocalUserMock).toHaveBeenCalledWith("operador@loja.com", "senha-local-123");
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(USER_SESSION_COOKIE);
    expect(cookies[0]?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 12 * 60 * 60 * 1000 });
    await expect(getUserSessionUserId(cookies[0]?.value ?? "")).resolves.toBe(31);
  });

  it("não cria uma sessão local quando a senha do operador é inválida", async () => {
    loginLocalUserMock.mockResolvedValue(null);
    const { ctx, cookies } = createPublicContext();

    await expect(appRouter.createCaller(ctx).userAuth.login({ email: "operador@loja.com", password: "senha-incorreta" })).resolves.toEqual({ success: false });
    expect(cookies).toHaveLength(0);
  });
});
