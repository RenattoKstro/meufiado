export type WorkingDaysMode = "automatic" | "manual";

type CalendarReference = {
  year: number;
  month: number;
  day: number;
};

function brazilReferenceDate(referenceDate = new Date()): CalendarReference {
  const pieces = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(referenceDate);
  const pick = (type: Intl.DateTimeFormatPartTypes) => Number(pieces.find(piece => piece.type === type)?.value ?? 0);
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

function isWorkingDay(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day)).getUTCDay() !== 0;
}

function countWorkingDays(year: number, monthIndex: number, startDay: number, endDay: number) {
  let total = 0;
  for (let day = startDay; day <= endDay; day += 1) {
    if (isWorkingDay(year, monthIndex, day)) total += 1;
  }
  return total;
}

export function automaticWorkingDays(referenceDate = new Date()) {
  const { year, month, day } = brazilReferenceDate(referenceDate);
  const monthIndex = month - 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const workingDaysTotal = countWorkingDays(year, monthIndex, 1, daysInMonth);
  const workingDaysElapsed = countWorkingDays(year, monthIndex, 1, day);
  const workingDaysRemaining = countWorkingDays(year, monthIndex, day + 1, daysInMonth);
  const ticketWorkingDaysRemaining = day <= 15 ? countWorkingDays(year, monthIndex, day, 15) : 0;

  return {
    workingDaysTotal,
    workingDaysElapsed,
    workingDaysRemaining,
    ticketWorkingDaysRemaining,
  };
}

export function applyWorkingDaysMode<T extends { workingDaysMode: string; workingDaysTotal: number; workingDaysElapsed: number; ticketWorkingDaysRemaining: number }>(values: T, referenceDate = new Date()): T {
  if (values.workingDaysMode === "manual") return values;
  const automatic = automaticWorkingDays(referenceDate);
  return {
    ...values,
    workingDaysTotal: automatic.workingDaysTotal,
    workingDaysElapsed: automatic.workingDaysElapsed,
    ticketWorkingDaysRemaining: automatic.ticketWorkingDaysRemaining,
  };
}
