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
      loginMethod: "oauth",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("permissões administrativas", () => {
  it("bloqueia a consulta administrativa para operador comum", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.branches()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
