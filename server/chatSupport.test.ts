import { describe, expect, it } from "vitest";
import { selectChatSupportAdmin } from "./db";

describe("selectChatSupportAdmin", () => {
  const now = new Date("2026-08-25T23:10:00.000Z").getTime();

  it("prioriza o administrador ativo mais recentemente para usuários operadores", () => {
    const recipient = selectChatSupportAdmin([
      { id: 1, name: "Administrador antigo", lastSignedIn: new Date(now - 20 * 60 * 1000) },
      { id: 2, name: "Renato", lastSignedIn: new Date(now - 30 * 1000) },
    ], 99, now);

    expect(recipient).toMatchObject({ id: 2, name: "Renato", isOnline: true, availabilityLabel: "Disponível agora" });
  });

  it("mantém o próprio administrador ativo como referência de disponibilidade", () => {
    const recipient = selectChatSupportAdmin([
      { id: 1, name: "Administrador antigo", lastSignedIn: new Date(now - 20 * 60 * 1000) },
      { id: 2, name: "Renato", lastSignedIn: new Date(now - 30 * 1000) },
    ], 2, now);

    expect(recipient).toMatchObject({ id: 2, isOnline: true });
  });
});
