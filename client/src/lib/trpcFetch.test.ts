import { describe, expect, it, vi } from "vitest";
import { fetchTrpcResponse } from "./trpcFetch";

describe("transporte tRPC", () => {
  it("interrompe uma resposta HTML antes que o cliente tente interpretá-la como JSON", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("<!doctype html><html></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }));

    await expect(fetchTrpcResponse("/api/trpc/admin.users,admin.branches,auth.me?batch=1", undefined, fetcher)).rejects.toThrow("A API retornou uma resposta inesperada (200)");
  });

  it("preserva respostas JSON válidas das procedures administrativas", async () => {
    const response = new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    const fetcher = vi.fn().mockResolvedValue(response);

    await expect(fetchTrpcResponse("/api/trpc/admin.users", undefined, fetcher)).resolves.toBe(response);
  });
});
