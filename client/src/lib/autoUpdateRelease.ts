const RELEASE_ENDPOINT = "/__manus__/version.json";
const RELEASE_STORAGE_KEY = "meu-fiado:published-release";
const POLL_INTERVAL_MS = 5_000;
const CACHE_BUSTER_PARAM = "_meu_fiado_release";

type ReleasePayload = {
  version?: string;
  timestamp?: number;
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.localStorage) return window.localStorage;
  } catch {
  }
  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function forceRefresh(publishedRelease: string) {
  if (typeof window === "undefined") return;

  const location = window.location;
  try {
    const url = new URL(location.href);
    url.searchParams.set(CACHE_BUSTER_PARAM, publishedRelease);
    if (typeof location.replace === "function") {
      location.replace(url.toString());
      return;
    }
  } catch {
    // Fallback below keeps the update working in restricted browsers and tests.
  }
  location.reload();
}

export async function checkForPublishedRelease(): Promise<boolean> {
  if (typeof window === "undefined" || typeof fetch === "undefined") return false;

  try {
    const response = await fetch(`${RELEASE_ENDPOINT}?_=${Date.now()}-${Math.random().toString(36).slice(2)}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
      },
    });
    if (!response.ok) return false;

    const payload = (await response.json()) as ReleasePayload;
    const publishedRelease = String(payload.version ?? payload.timestamp ?? "").trim();
    if (!publishedRelease) return false;

    const storage = getStorage();
    if (!storage) return false;

    const knownRelease = storage.getItem(RELEASE_STORAGE_KEY);
    if (!knownRelease) {
      storage.setItem(RELEASE_STORAGE_KEY, publishedRelease);
      return false;
    }
    if (knownRelease === publishedRelease) return false;

    storage.setItem(RELEASE_STORAGE_KEY, publishedRelease);
    forceRefresh(publishedRelease);
    return true;
  } catch (error) {
    console.warn("Não foi possível verificar uma nova publicação do Meu Fiado.", error);
    return false;
  }
}

export function startPublishedReleasePolling(): () => void {
  if (typeof window === "undefined") return () => undefined;

  let stopped = false;
  const run = () => {
    if (!stopped) void checkForPublishedRelease();
  };
  const timer = window.setInterval(run, POLL_INTERVAL_MS);
  void checkForPublishedRelease();
  const onResume = () => { void checkForPublishedRelease(); };
  window.addEventListener("focus", onResume);
  window.addEventListener("online", onResume);
  document.addEventListener("visibilitychange", onResume);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    window.removeEventListener("focus", onResume);
    window.removeEventListener("online", onResume);
    document.removeEventListener("visibilitychange", onResume);
  };
}

export const publishedReleaseConfig = {
  endpoint: RELEASE_ENDPOINT,
  storageKey: RELEASE_STORAGE_KEY,
  pollIntervalMs: POLL_INTERVAL_MS,
  cacheBusterParam: CACHE_BUSTER_PARAM,
};
