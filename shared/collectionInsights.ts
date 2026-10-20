export function monthOverMonth(currentReceived: number, previousReceived: number) {
  const current = Math.max(0, currentReceived);
  const previous = Math.max(0, previousReceived);
  const difference = current - previous;
  return {
    difference,
    percent: previous > 0 ? (difference / previous) * 100 : null,
    direction: difference > 0 ? "up" as const : difference < 0 ? "down" as const : "stable" as const,
  };
}
