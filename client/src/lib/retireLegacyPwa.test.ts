import { afterEach, describe, expect, it, vi } from "vitest";
import { retireLegacyPwa } from "./retireLegacyPwa";

describe("retirada do PWA legado", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("remove todos os registros e caches legados, recarregando apenas uma vez", async () => {
    const unregisterFirst = vi.fn().mockResolvedValue(true);
    const unregisterSecond = vi.fn().mockResolvedValue(false);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const getItem = vi.fn().mockReturnValue(null);
    const setItem = vi.fn();
    const reload = vi.fn();

    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistrations: vi.fn().mockResolvedValue([
          { unregister: unregisterFirst },
          { unregister: unregisterSecond },
        ]),
      },
    });
    vi.stubGlobal("window", {
      caches: {
        keys: vi.fn().mockResolvedValue(["workbox-precache", "meu-fiado-v1"]),
        delete: deleteCache,
      },
      sessionStorage: { getItem, setItem },
      location: { reload },
    });

    await retireLegacyPwa();

    expect(unregisterFirst).toHaveBeenCalledOnce();
    expect(unregisterSecond).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(setItem).toHaveBeenCalledWith("meu-fiado:pwa-retired:2026.09.02.1", "done");
    expect(reload).toHaveBeenCalledOnce();
  });

  it("não recarrega novamente quando a limpeza já ocorreu na mesma aba", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const reload = vi.fn();

    vi.stubGlobal("navigator", {
      serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }]) },
    });
    vi.stubGlobal("window", {
      caches: { keys: vi.fn().mockResolvedValue([]), delete: vi.fn() },
      sessionStorage: { getItem: vi.fn().mockReturnValue("done"), setItem: vi.fn() },
      location: { reload },
    });

    await retireLegacyPwa();

    expect(unregister).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it("permanece inerte quando o navegador não oferece APIs de PWA", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", {});

    await expect(retireLegacyPwa()).resolves.toBeUndefined();
  });
});
