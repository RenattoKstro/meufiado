import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const getMyProfileMock = vi.hoisted(() => vi.fn());

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  getMyProfile: getMyProfileMock,
}));

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
  beforeEach(() => {
    getMyProfileMock.mockReset();
  });

  it("retorna null quando o usuário não possui perfil ou filial", async () => {
    getMyProfileMock.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(contextWithoutProfile());
    await expect(caller.profile.mine()).resolves.toBeNull();
  });

  it("retorna o perfil inicial Google com filial nula para acionar o onboarding", async () => {
    const initialProfile = {
      profile: {
        id: 204,
        userId: 999999999,
        fullName: "Operadora Google",
        email: "without-profile@example.com",
        branchId: null,
        phone: null,
        profileComplete: false,
        isActive: true,
      },
      branch: null,
    };
    getMyProfileMock.mockResolvedValue(initialProfile);

    const caller = appRouter.createCaller(contextWithoutProfile());

    await expect(caller.profile.mine()).resolves.toEqual(initialProfile);
    expect(getMyProfileMock).toHaveBeenCalledWith(999999999);
  });
});
