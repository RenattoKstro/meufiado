import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("publicação estática", () => {
  it("mantém o fallback SPA sem sobrescrever arquivos existentes", () => {
    const config = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
    expect(config).toContain('publish = "dist/public"');
    expect(config).toContain('to = "/index.html"');
    expect(config).not.toContain("force = true");
  });

  it("gera um runtime que serve dist/public e aceita rotas SPA", () => {
    const script = fs.readFileSync(path.join(root, "scripts/write-static-runtime.mjs"), "utf8");
    expect(script).toContain('path.resolve("dist/index.js")');
    expect(script).toContain('process.env.PORT || 3000');
    expect(script).toContain("indexPath");
  });
});
