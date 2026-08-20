import { describe, expect, it } from "vitest";
import { applyWorkingDaysMode, automaticWorkingDays } from "./workingDays";

describe("calendário de dias úteis", () => {
  it("conta o mês atual sem domingos e calcula o prazo da Meta 80% até o dia 15", () => {
    const calendar = automaticWorkingDays(new Date("2026-08-10T15:00:00.000Z"));

    expect(calendar).toEqual({
      workingDaysTotal: 26,
      workingDaysElapsed: 8,
      workingDaysRemaining: 18,
      ticketWorkingDaysRemaining: 6,
    });
  });

  it("mantém os valores que o usuário definiu quando o modo é manual", () => {
    const manual = applyWorkingDaysMode({ workingDaysMode: "manual", workingDaysTotal: 20, workingDaysElapsed: 7, ticketWorkingDaysRemaining: 4 }, new Date("2026-08-10T15:00:00.000Z"));

    expect(manual).toEqual({ workingDaysMode: "manual", workingDaysTotal: 20, workingDaysElapsed: 7, ticketWorkingDaysRemaining: 4 });
  });
});
