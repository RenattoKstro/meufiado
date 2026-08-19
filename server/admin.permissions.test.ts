import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
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
  it("bloqueia a consulta administrativa para operador comum autenticado pelo Google", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.branches()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("entrega a visão de filiais a operadores autenticados e bloqueia visitantes", async () => {
    const operatorCaller = appRouter.createCaller(contextFor("user"));
    const overview = await operatorCaller.branches.overview();
    expect(overview).toEqual(expect.any(Array));

    const guestCaller = appRouter.createCaller(contextWithoutUser());
    await expect(guestCaller.branches.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
