import { afterEach, describe, expect, it, vi } from "vitest";
import { checkForPublishedRelease, publishedReleaseConfig } from "./autoUpdateRelease";

describe("atualização automática de publicações", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registra a primeira versão sem recarregar a página", async () => {
    const setItem = vi.fn();
    const reload = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { getItem: vi.fn().mockReturnValue(null), setItem }, location: { reload } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: "release-1" }) }));

    await expect(checkForPublishedRelease()).resolves.toBe(false);
    expect(setItem).toHaveBeenCalledWith(publishedReleaseConfig.storageKey, "release-1");
    expect(reload).not.toHaveBeenCalled();
  });

  it("recarrega automaticamente com cache busting quando uma nova versão é publicada", async () => {
    const setItem = vi.fn();
    const replace = vi.fn();
    const reload = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { getItem: vi.fn().mockReturnValue("release-1"), setItem }, location: { href: "https://meufiado.com/plano?tab=pagamento", replace, reload } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: "release-2" }) }));

    await expect(checkForPublishedRelease()).resolves.toBe(true);
    expect(setItem).toHaveBeenCalledWith(publishedReleaseConfig.storageKey, "release-2");
    expect(replace).toHaveBeenCalledWith(expect.stringContaining(`${publishedReleaseConfig.cacheBusterParam}=release-2`));
    expect(reload).not.toHaveBeenCalled();
  });

  it("usa reload como fallback quando o navegador não permite replace", async () => {
    const reload = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { getItem: vi.fn().mockReturnValue("release-1"), setItem: vi.fn() }, location: { reload } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: "release-2" }) }));

    await expect(checkForPublishedRelease()).resolves.toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("não recarrega quando a publicação continua na mesma versão", async () => {
    const reload = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { getItem: vi.fn().mockReturnValue("release-2"), setItem: vi.fn() }, location: { reload } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: "release-2" }) }));

    await expect(checkForPublishedRelease()).resolves.toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
