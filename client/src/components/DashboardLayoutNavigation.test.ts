import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const layoutSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
const appSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("navegação consolidada de metas", () => {
  it("mantém as metas na Visão Geral e não mostra guias separadas no menu", () => {
    expect(layoutSource).not.toContain('{ label: "Meta Fiado", path: "/fiado"');
    expect(layoutSource).not.toContain('{ label: "Meta Desafio", path: "/desafio"');
    expect(layoutSource).toContain('{ label: "Visão geral", path: "/"');
  });

  it("redireciona links legados das metas para a Visão Geral", () => {
    expect(appSource).toContain("function LegacyMetaRedirect()");
    expect(appSource).toContain('path="/fiado" component={LegacyMetaRedirect}');
    expect(appSource).toContain('path="/desafio" component={LegacyMetaRedirect}');
  });
});
