import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import {
  deleteExpiredChatMessages,
  expireSubscriptionsPastGracePeriod,
  processMercadoPagoPixWebhook,
} from "../db";
import { createContext } from "./context";
import { apiNotFoundHandler } from "./apiFallback";
import { sdk } from "./sdk";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";
import {
  getMercadoPagoWebhookDataId,
  getMercadoPagoWebhookRequestId,
  verifyMercadoPagoWebhookSignature,
  type MercadoPagoWebhookNotification,
} from "../mercadoPago";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.post("/api/mercado-pago/webhook", async (req, res) => {
    const notification = (req.body ?? {}) as MercadoPagoWebhookNotification;
    const dataId = getMercadoPagoWebhookDataId(req.query as Record<string, unknown>, notification);
    const requestId = getMercadoPagoWebhookRequestId(req.headers as Record<string, string | string[] | undefined>);
    const signatureIsValid = verifyMercadoPagoWebhookSignature({
      signature: req.headers["x-signature"],
      requestId,
      dataId,
      secret: ENV.mercadoPagoWebhookSecret,
    });
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
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  app.post("/api/scheduled/cleanup-chat", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }

      const [deletedCount, subscriptions] = await Promise.all([
        deleteExpiredChatMessages(),
        expireSubscriptionsPastGracePeriod(),
      ]);
      return res.json({ ok: true, deletedCount, expiredSubscriptions: subscriptions.affected });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Falha ao limpar mensagens vencidas.",
        context: { path: "/api/scheduled/cleanup-chat" },
        timestamp: new Date().toISOString(),
      });
    }
  });
  // Nunca deixe uma chamada de API desconhecida cair no fallback do SPA, que responde HTML.
  app.use("/api", apiNotFoundHandler);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
