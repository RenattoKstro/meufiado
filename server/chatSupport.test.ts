import { describe, expect, it } from "vitest";
import { selectChatSupportAdmin } from "./db";

describe("selectChatSupportAdmin", () => {
  const now = new Date("2026-08-25T23:10:00.000Z").getTime();

  it("prioriza o administrador ativo mais recentemente para usuários operadores", () => {
    const recipient = selectChatSupportAdmin([
      { id: 1, name: "Administrador antigo", lastSignedIn: new Date(now - 20 * 60 * 1000), supportAvailability: "available" },
      { id: 2, name: "Renato", lastSignedIn: new Date(now - 30 * 1000), supportAvailability: "available" },
    ], 99, now);

    expect(recipient).toMatchObject({ id: 2, name: "Renato", isOnline: true, availabilityLabel: "Disponível agora" });
  });

  it("mantém o próprio administrador ativo como referência de disponibilidade", () => {
    const recipient = selectChatSupportAdmin([
      { id: 1, name: "Administrador antigo", lastSignedIn: new Date(now - 20 * 60 * 1000), supportAvailability: "available" },
      { id: 2, name: "Renato", lastSignedIn: new Date(now - 30 * 1000), supportAvailability: "available" },
    ], 2, now);

    expect(recipient).toMatchObject({ id: 2, isOnline: true });
  });

  it("prioriza o status manual Ausente sobre a presença automática", () => {
    const recipient = selectChatSupportAdmin([
      { id: 2, name: "Renato", lastSignedIn: new Date(now - 30 * 1000), supportAvailability: "away" },
    ], 99, now);

    expect(recipient).toMatchObject({ id: 2, isOnline: true, availabilityLabel: "Ausente" });
  });

  it("prioriza o status manual Em atendimento sobre a presença automática", () => {
    const recipient = selectChatSupportAdmin([
      { id: 2, name: "Renato", lastSignedIn: new Date(now - 30 * 1000), supportAvailability: "busy" },
    ], 99, now);

    expect(recipient).toMatchObject({ id: 2, isOnline: true, availabilityLabel: "Em atendimento" });
  });
});
