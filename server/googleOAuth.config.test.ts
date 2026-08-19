import { describe, expect, it } from "vitest";

describe("configuração OAuth direta do Google", () => {
  it("disponibiliza um Client ID Web do Google para o Meu Fiado", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toBeTruthy();
    expect(clientId).toMatch(/^[\w-]+\.apps\.googleusercontent\.com$/);
  });
});
