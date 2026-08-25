export const SUBSCRIPTION_GRACE_DAYS = 5;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type SubscriptionPlan = "free" | "pro";
export type SubscriptionAccessStatus = "free" | "active" | "grace" | "expired";

export function resolveSubscriptionAccess(input: {
  plan: SubscriptionPlan;
  proExpiresAt: Date | string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const expiresAt = input.proExpiresAt ? new Date(input.proExpiresAt) : null;

  if (input.plan !== "pro") {
    return { plan: "free" as const, isPro: false, status: "free" as const, graceEndsAt: null };
  }

  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    return { plan: "pro" as const, isPro: true, status: "active" as const, graceEndsAt: null };
  }

  if (expiresAt.getTime() >= now.getTime()) {
    return { plan: "pro" as const, isPro: true, status: "active" as const, graceEndsAt: null };
  }

  const graceEndsAt = new Date(expiresAt.getTime() + SUBSCRIPTION_GRACE_DAYS * DAY_IN_MILLISECONDS);
  if (graceEndsAt.getTime() > now.getTime()) {
    return { plan: "pro" as const, isPro: true, status: "grace" as const, graceEndsAt };
  }

  return { plan: "free" as const, isPro: false, status: "expired" as const, graceEndsAt };
}
