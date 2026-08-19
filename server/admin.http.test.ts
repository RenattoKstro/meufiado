import express from "express";
import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import type { Server } from "node:http";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

function adminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-http-regression",
      email: "admin@example.com",
      name: "Administrador",
      loginMethod: "google",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("HTTP tRPC da administração", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = undefined;
  });

  it("responde JSON válido para admin.users, admin.branches e auth.me no mesmo lote da página /admin", async () => {
    const app = express();
    app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext: adminContext }));
    server = createServer(app);
    await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Porta de teste indisponível.");

    const input = encodeURIComponent(JSON.stringify({ 0: { json: null }, 1: { json: null }, 2: { json: null } }));
    const response = await fetch(`http://127.0.0.1:${address.port}/api/trpc/admin.users,admin.branches,auth.me?batch=1&input=${input}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    const payload = await response.json();
    expect(payload).toHaveLength(3);
    expect(payload[0].result.data.json).toEqual(expect.any(Array));
    expect(payload[1].result.data.json).toEqual(expect.any(Array));
    expect(payload[2].result.data.json).toMatchObject({ id: 1, role: "admin" });
  });
});
