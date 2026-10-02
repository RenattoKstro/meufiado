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

  it("não conta hoje quando a opção está desativada", () => {
    const calendar = automaticWorkingDays(new Date("2026-08-10T15:00:00.000Z"), { countToday: false });

    expect(calendar).toEqual({
      workingDaysTotal: 26,
      workingDaysElapsed: 7,
      workingDaysRemaining: 19,
      ticketWorkingDaysRemaining: 5,
    });
  });

  it("permite retirar sábado e incluir domingo na mesma configuração", () => {
    const calendar = automaticWorkingDays(new Date("2026-08-10T15:00:00.000Z"), { includeSaturday: false, includeSunday: true });

    expect(calendar).toEqual({
      workingDaysTotal: 26,
      workingDaysElapsed: 8,
      workingDaysRemaining: 18,
      ticketWorkingDaysRemaining: 5,
    });
  });

  it("remove feriados da contagem automática e do prazo da Meta 80%", () => {
    const calendar = automaticWorkingDays(new Date("2026-08-10T15:00:00.000Z"), { manualHolidayDates: ["2026-08-10"] });

    expect(calendar).toEqual({
      workingDaysTotal: 25,
      workingDaysElapsed: 7,
      workingDaysRemaining: 18,
      ticketWorkingDaysRemaining: 5,
    });
  });

  it("conta o último dia do mês quando ele não é domingo e contar hoje está ativo", () => {
    const calendar = automaticWorkingDays(new Date("2026-08-31T15:00:00.000Z"), { countToday: true });

    expect(calendar.workingDaysRemaining).toBe(0);
    expect(calendar.workingDaysElapsed).toBe(calendar.workingDaysTotal);
  });
});
