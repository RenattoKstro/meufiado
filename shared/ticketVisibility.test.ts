import { describe, expect, it } from "vitest";
import { shouldShowTicketGoal } from "./ticketVisibility";

describe("visibilidade da Meta Ticket", () => {
  it("fica visível até o dia 15", () => {
    expect(shouldShowTicketGoal({ dayOfMonth: 15, showTicketGoal: true, showAfterDeadline: false })).toBe(true);
  });

  it("fica oculta automaticamente a partir do dia 16", () => {
    expect(shouldShowTicketGoal({ dayOfMonth: 16, showTicketGoal: true, showAfterDeadline: false })).toBe(false);
  });

  it("pode continuar visível após o prazo quando ativada em Ajustes", () => {
    expect(shouldShowTicketGoal({ dayOfMonth: 16, showTicketGoal: true, showAfterDeadline: true })).toBe(true);
    expect(shouldShowTicketGoal({ dayOfMonth: 20, showTicketGoal: false, showAfterDeadline: true })).toBe(false);
  });
});
