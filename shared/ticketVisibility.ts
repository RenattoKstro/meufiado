export function shouldShowTicketGoal(input: {
  dayOfMonth: number;
  showTicketGoal: boolean;
  showAfterDeadline: boolean;
}) {
  if (!input.showTicketGoal) return false;
  return input.dayOfMonth <= 15 || input.showAfterDeadline;
}
