export type SubscriberGoalStatus = "undefined" | "below" | "achieved";

export function subscriberGoalStatus(minimum: number, current: number): SubscriberGoalStatus {
  if (!Number.isFinite(minimum) || minimum <= 0) return "undefined";
  return current >= minimum ? "achieved" : "below";
}

export function subscriberGoalLabel(minimum: number, current: number): string {
  return subscriberGoalStatus(minimum, current) === "undefined" ? "Não definida" : `${current} de ${minimum}`;
}
