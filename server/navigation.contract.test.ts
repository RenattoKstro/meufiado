import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("contrato da navegação lateral", () => {
  it("usa links nativos para as rotas do painel", async () => {
    const source = await readFile(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(source).toContain('import { Link, useLocation } from "wouter"');
    expect(source).toContain("<Link href={item.path}>");
    ["/fiado", "/desafio", "/ajustes", "/configuracoes", "/seguranca"].forEach(path => {
      expect(source).toContain(`path: "${path}"`);
    });
  });
});
