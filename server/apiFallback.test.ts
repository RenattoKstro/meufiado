import express from "express";
import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { apiNotFoundHandler } from "./_core/apiFallback";

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
});
