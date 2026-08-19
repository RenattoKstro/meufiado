import express from "express";
import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { apiNotFoundHandler } from "./_core/apiFallback";

const ADMIN_DASHBOARD_BATCH_PATH = "/api/trpc/admin.users,admin.branches,auth.me?batch=1";

describe("fallback de API", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = undefined;
  });

  it("retorna JSON 404 em vez do HTML do aplicativo para uma rota de API desconhecida", () => {
    const json = vi.fn();
    const response = { status: vi.fn().mockReturnValue({ json }) };

    apiNotFoundHandler({} as never, response as never, vi.fn());

    expect(response.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "Endpoint de API não encontrado." });
  });

  it("responde JSON 404 para uma rota administrativa inesperada antes que o fallback HTML da interface seja alcançado", async () => {
    const app = express();
    app.use("/api", apiNotFoundHandler);
    app.use((_request, response) => response.type("html").send("<!doctype html><html></html>"));
    server = createServer(app);
    await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Porta de teste indisponível.");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/resumo-legado`);

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ error: "Endpoint de API não encontrado." });
  });

  it("documenta o modo de falha: sem um handler de API, o lote de /admin cai no fallback HTML; com a proteção, retorna JSON", async () => {
    const legacyApp = express();
    legacyApp.use((_request, response) => response.type("html").status(200).send("<!doctype html><html><body>Aplicativo</body></html>"));
    server = createServer(legacyApp);
    await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
    const legacyAddress = server.address();
    if (!legacyAddress || typeof legacyAddress === "string") throw new Error("Porta de teste indisponível.");

    const legacyResponse = await fetch(`http://127.0.0.1:${legacyAddress.port}${ADMIN_DASHBOARD_BATCH_PATH}`);

    expect(legacyResponse.status).toBe(200);
    expect(legacyResponse.headers.get("content-type")).toContain("text/html");
    await expect(legacyResponse.text()).resolves.toContain("<!doctype html>");
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = undefined;

    const protectedApp = express();
    protectedApp.use("/api", apiNotFoundHandler);
    protectedApp.use((_request, response) => response.type("html").status(200).send("<!doctype html><html><body>Aplicativo</body></html>"));
    server = createServer(protectedApp);
    await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
    const protectedAddress = server.address();
    if (!protectedAddress || typeof protectedAddress === "string") throw new Error("Porta de teste indisponível.");

    const protectedResponse = await fetch(`http://127.0.0.1:${protectedAddress.port}${ADMIN_DASHBOARD_BATCH_PATH}`);

    expect(protectedResponse.status).toBe(404);
    expect(protectedResponse.headers.get("content-type")).toContain("application/json");
    await expect(protectedResponse.json()).resolves.toEqual({ error: "Endpoint de API não encontrado." });
  });
});
