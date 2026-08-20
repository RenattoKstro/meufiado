import { describe, expect, it, vi } from "vitest";
import { createAppRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const adminContext = (): TrpcContext => ({
  user: {
    id: 4101,
    openId: "admin-without-branch",
    name: "Administradora",
    email: "admin-sem-filial@example.com",
    loginMethod: "google",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

const metricsInput = {
  portfolioTotal: 0,
  monthOpening: 0,
  dayOpening: 0,
  currentOverdue: 0,
  creditGoal: 0,
  challengeGoal: 0,
  lostGoal: 0,
  lostReceived: 0,
  workingDaysTotal: 0,
  workingDaysElapsed: 0,
  ticketWorkingDaysRemaining: 0,
  fiadoAtDay15: false,
};

describe("métricas do administrador sem filial", () => {
  it("retorna estado seguro e bloqueia gravação operacional sem consultar métricas de filial", async () => {
    const getMyMetrics = vi.fn();
    const saveMyMetrics = vi.fn();
    const app = createAppRouter({ getMyProfile: vi.fn().mockResolvedValue(undefined), getMyMetrics, saveMyMetrics });
    const caller = app.createCaller(adminContext());

    await expect(caller.metrics.mine()).resolves.toBeNull();
    expect(getMyMetrics).not.toHaveBeenCalled();

    await expect(caller.metrics.save(metricsInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(saveMyMetrics).not.toHaveBeenCalled();
  });
});
