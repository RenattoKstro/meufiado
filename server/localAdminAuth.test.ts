import { describe, expect, it } from "vitest";
import { createAdminSession, createUserSession, getAdminSessionUserId, getUserSessionUserId, hashPassword, verifyPassword } from "./localAdminAuth";

describe("senha administrativa local", () => {
  it("gera hash não reversível e valida somente a senha correta", async () => {
    const hash = await hashPassword("senha-segura-123");
    expect(hash).not.toContain("senha-segura-123");
    await expect(verifyPassword("senha-segura-123", hash)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", hash)).resolves.toBe(false);
  });

  it("emite uma sessão assinada e recupera somente o identificador esperado", async () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "chave-de-teste-para-sessao-administrativa";
    const token = await createAdminSession(27);
    await expect(getAdminSessionUserId(token)).resolves.toBe(27);
    await expect(getAdminSessionUserId(`${token}alterado`)).resolves.toBeNull();
    process.env.JWT_SECRET = previousSecret;
  });

  it("emite uma sessão de operador que não é aceita como sessão administrativa", async () => {
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "chave-de-teste-para-sessao-de-operador";
    const token = await createUserSession(31);
    await expect(getUserSessionUserId(token)).resolves.toBe(31);
    await expect(getAdminSessionUserId(token)).resolves.toBeNull();
    process.env.JWT_SECRET = previousSecret;
  });
});
