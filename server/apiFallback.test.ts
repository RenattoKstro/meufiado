import { describe, expect, it, vi } from "vitest";
import { apiNotFoundHandler } from "./_core/apiFallback";

describe("fallback de API", () => {
  it("retorna JSON 404 em vez do HTML do aplicativo para uma rota de API desconhecida", () => {
    const json = vi.fn();
    const response = { status: vi.fn().mockReturnValue({ json }) };

    apiNotFoundHandler({} as never, response as never, vi.fn());

    expect(response.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "Endpoint de API não encontrado." });
  });
});
