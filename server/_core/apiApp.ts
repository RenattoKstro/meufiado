import "dotenv/config";
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { deleteExpiredChatMessages, expireSubscriptionsPastGracePeriod, processMercadoPagoPixWebhook } from "../db";
import { createContext } from "./context";
import { apiNotFoundHandler } from "./apiFallback";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { getMercadoPagoWebhookDataId, getMercadoPagoWebhookRequestId, verifyMercadoPagoWebhookSignature, type MercadoPagoWebhookNotification } from "../mercadoPago";

export function registerApiRoutes(app: Express) {
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.post("/api/mercado-pago/webhook", async (req, res) => {
    const notification = (req.body ?? {}) as MercadoPagoWebhookNotification;
    const dataId = getMercadoPagoWebhookDataId(req.query as Record<string, unknown>, notification);
    const requestId = getMercadoPagoWebhookRequestId(req.headers as Record<string, string | string[] | undefined>);
    const signatureIsValid = verifyMercadoPagoWebhookSignature({ signature: req.headers["x-signature"], requestId, dataId, secret: ENV.mercadoPagoWebhookSecret });
    if (!signatureIsValid) return res.status(401).json({ error: "Assinatura do webhook inválida." });
    const isPaymentNotification = notification.type === "payment" || notification.topic === "payment" || notification.action?.startsWith("payment.");
    if (!isPaymentNotification || !dataId) return res.status(200).json({ ok: true, ignored: true });
    try {
      const result = await processMercadoPagoPixWebhook(dataId);
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      console.error("[Mercado Pago] Falha ao processar webhook PIX:", error);
      return res.status(500).json({ error: "Falha temporária ao processar o pagamento." });
    }
  });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  app.post("/api/scheduled/cleanup-chat", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const [deletedCount, subscriptions] = await Promise.all([deleteExpiredChatMessages(), expireSubscriptionsPastGracePeriod()]);
      return res.json({ ok: true, deletedCount, expiredSubscriptions: subscriptions.affected });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Falha ao limpar mensagens vencidas.", context: { path: "/api/scheduled/cleanup-chat" }, timestamp: new Date().toISOString() });
    }
  });
  app.use("/api", apiNotFoundHandler);
  return app;
}

export function createApiApp() {
  return registerApiRoutes(express());
}
