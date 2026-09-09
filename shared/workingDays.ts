export type WorkingDaysMode = "automatic" | "manual";

export type WorkingDayOptions = {
  countToday?: boolean;
  includeSaturday?: boolean;
  includeSunday?: boolean;
  manualHolidayDates?: string[];
};

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

function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isWorkingDay(year: number, monthIndex: number, day: number, options: Required<WorkingDayOptions>) {
  const weekday = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  if (weekday === 0 && !options.includeSunday) return false;
  if (weekday === 6 && !options.includeSaturday) return false;
  return !options.manualHolidayDates.includes(dateKey(year, monthIndex, day));
}

function countWorkingDays(year: number, monthIndex: number, startDay: number, endDay: number, options: Required<WorkingDayOptions>) {
  let total = 0;
  for (let day = Math.max(1, startDay); day <= endDay; day += 1) {
    if (isWorkingDay(year, monthIndex, day, options)) total += 1;
  }
  return total;
}

export function automaticWorkingDays(referenceDate = new Date(), inputOptions: WorkingDayOptions = {}) {
  const { year, month, day } = brazilReferenceDate(referenceDate);
  const options: Required<WorkingDayOptions> = {
    countToday: inputOptions.countToday ?? true,
    includeSaturday: inputOptions.includeSaturday ?? true,
    includeSunday: inputOptions.includeSunday ?? false,
    manualHolidayDates: Array.from(new Set(inputOptions.manualHolidayDates ?? [])).filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)),
  };
  const monthIndex = month - 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const elapsedEnd = options.countToday ? day : day - 1;
  const remainingStart = options.countToday ? day + 1 : day;
  const ticketStart = options.countToday ? day : day + 1;

  return {
    workingDaysTotal: countWorkingDays(year, monthIndex, 1, daysInMonth, options),
    workingDaysElapsed: countWorkingDays(year, monthIndex, 1, elapsedEnd, options),
    workingDaysRemaining: countWorkingDays(year, monthIndex, remainingStart, daysInMonth, options),
    ticketWorkingDaysRemaining: day <= 15 ? countWorkingDays(year, monthIndex, ticketStart, 15, options) : 0,
  };
}

export function applyWorkingDaysMode<T extends { workingDaysMode: string; workingDaysTotal: number; workingDaysElapsed: number; ticketWorkingDaysRemaining: number; countToday?: boolean; includeSaturday?: boolean; includeSunday?: boolean; manualHolidayDates?: string[] }>(values: T, referenceDate = new Date()): T {
  if (values.workingDaysMode === "manual") return values;
  const automatic = automaticWorkingDays(referenceDate, values);
  return {
    ...values,
    workingDaysTotal: automatic.workingDaysTotal,
    workingDaysElapsed: automatic.workingDaysElapsed,
    ticketWorkingDaysRemaining: automatic.ticketWorkingDaysRemaining,
  };
}
