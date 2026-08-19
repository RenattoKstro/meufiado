import { describe, expect, it } from "vitest";
import { getMyProfile, loginGoogleOperator } from "./db";

describe("autocadastro pelo Google", () => {
  it("cria conta e perfil inicial incompleto quando a identidade Google ainda não possui cadastro", async () => {
    const queries = [[], [], [{ id: 73, openId: "google-primeiro-acesso", email: "novo@loja.com", name: "Nova Operadora", loginMethod: "google", role: "user" }]];
    const inserts: Record<string, unknown>[] = [];
    const database = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => queries.shift() ?? [] }) }) }),
      insert: () => ({ values: async (values: Record<string, unknown>) => { inserts.push(values); } }),
    };

    const account = await loginGoogleOperator({ subject: "primeiro-acesso", email: "novo@loja.com", name: "Nova Operadora" }, database as never);

    expect(account).toMatchObject({ id: 73, openId: "google-primeiro-acesso", email: "novo@loja.com" });
    expect(inserts).toEqual([
      expect.objectContaining({ openId: "google-primeiro-acesso", email: "novo@loja.com", loginMethod: "google", role: "user" }),
      expect.objectContaining({ userId: 73, email: "novo@loja.com", fullName: "Nova Operadora", profileComplete: false, isActive: true }),
    ]);
  });

  it("mantém o perfil inicial consultável, sem filial, até a conclusão do onboarding", async () => {
    const profile = {
      id: 204,
      userId: 73,
      fullName: "Nova Operadora",
      email: "novo@loja.com",
      branchId: null,
      phone: null,
      instagram: null,
      operatorType: "leader",
      profileComplete: false,
      colorMode: "dark",
      colorPalette: "ocean",
      showLostGoal: false,
      isOnVacation: false,
      isActive: true,
    };
    const database = {
      select: () => ({ from: () => ({ leftJoin: () => ({ where: () => ({ limit: async () => [{ profile, branch: null }] }) }) }) }),
    };

    await expect(getMyProfile(73, database as never)).resolves.toEqual({ profile, branch: null });
  });
});
