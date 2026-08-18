import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextWithoutProfile(): TrpcContext {
  return {
    user: {
      id: 999999999,
      openId: "profile-without-registration",
      email: "without-profile@example.com",
      name: "Usuário sem perfil",
      loginMethod: "oauth",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("profile.mine", () => {
  it("retorna null quando o usuário não possui perfil ou filial", async () => {
    const caller = appRouter.createCaller(contextWithoutProfile());
    await expect(caller.profile.mine()).resolves.toBeNull();
  });
});
