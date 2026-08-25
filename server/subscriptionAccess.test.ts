import { describe, expect, it } from "vitest";
import { SUBSCRIPTION_GRACE_DAYS, resolveSubscriptionAccess } from "../shared/subscriptionAccess";

describe("validade da assinatura PRO", () => {
  const now = new Date("2026-08-25T12:00:00.000Z");

  it("mantém a assinatura PRO ativa até a data de vencimento", () => {
    expect(resolveSubscriptionAccess({ plan: "pro", proExpiresAt: new Date("2026-08-26T12:00:00.000Z"), now })).toMatchObject({ plan: "pro", isPro: true, status: "active" });
  });

  it("mantém acesso PRO durante os cinco dias de carência", () => {
    const expiresAt = new Date("2026-08-24T12:00:00.000Z");
    const access = resolveSubscriptionAccess({ plan: "pro", proExpiresAt: expiresAt, now });
    expect(access).toMatchObject({ plan: "pro", isPro: true, status: "grace" });
    expect(access.graceEndsAt).toEqual(new Date(expiresAt.getTime() + SUBSCRIPTION_GRACE_DAYS * 24 * 60 * 60 * 1000));
  });

  it("rebaixa a conta ao Free depois do último instante da carência", () => {
    const expiresAt = new Date(now.getTime() - SUBSCRIPTION_GRACE_DAYS * 24 * 60 * 60 * 1000);
    expect(resolveSubscriptionAccess({ plan: "pro", proExpiresAt: expiresAt, now })).toMatchObject({ plan: "free", isPro: false, status: "expired" });
  });

  it("preserva acessos PRO legados sem uma data de vencimento", () => {
    expect(resolveSubscriptionAccess({ plan: "pro", proExpiresAt: null, now })).toMatchObject({ plan: "pro", isPro: true, status: "active" });
  });
});
