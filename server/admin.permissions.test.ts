import { describe, expect, it } from "vitest";
import { createAppRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "user" | "admin"): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "permission-check",
      email: "operador@example.com",
      name: "Operador",
      loginMethod: "google",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function contextWithoutUser(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("permissões administrativas", () => {
  const router = createAppRouter({ canAccessSubscriptionFeature: async () => true });

  it("bloqueia a consulta administrativa para operador comum autenticado pelo Google", async () => {
    const caller = router.createCaller(contextFor("user"));
    await expect(caller.admin.branches()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("entrega a visão de filiais a operadores autenticados e bloqueia visitantes", async () => {
    const operatorCaller = router.createCaller(contextFor("user"));
    const overview = await operatorCaller.branches.overview();
    expect(overview).toEqual(expect.any(Array));

    const guestCaller = router.createCaller(contextWithoutUser());
    await expect(guestCaller.branches.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("entrega a Matriz somente a administradores e usuários PRO, sem procedimento de edição", async () => {
    const proRouter = createAppRouter({ getMySubscription: async () => ({ isPro: true } as never) });
    const freeRouter = createAppRouter({ getMySubscription: async () => ({ isPro: false } as never) });
    const operatorCaller = proRouter.createCaller(contextFor("user"));
    const matrix = await operatorCaller.matrix.overview();
    expect(matrix).toEqual(expect.any(Array));

    await expect(freeRouter.createCaller(contextFor("user")).matrix.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(freeRouter.createCaller(contextFor("admin")).matrix.overview()).resolves.toEqual(expect.any(Array));

    const guestCaller = proRouter.createCaller(contextWithoutUser());
    await expect(guestCaller.matrix.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
