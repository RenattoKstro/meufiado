const RELEASE_ENDPOINT = "/__manus__/version.json";
const RELEASE_STORAGE_KEY = "meu-fiado:published-release";
const POLL_INTERVAL_MS = 60_000;

type ReleasePayload = {
  version?: string;
  timestamp?: number;
};

function getStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export async function checkForPublishedRelease(): Promise<boolean> {
  if (typeof window === "undefined" || typeof fetch === "undefined") return false;

  try {
    const response = await fetch(`${RELEASE_ENDPOINT}?_=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
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
    window.location.reload();
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
    if (!stopped && document.visibilityState !== "hidden") void checkForPublishedRelease();
  };
  const timer = window.setInterval(run, POLL_INTERVAL_MS);
  void checkForPublishedRelease();

  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
}

export const publishedReleaseConfig = {
  endpoint: RELEASE_ENDPOINT,
  storageKey: RELEASE_STORAGE_KEY,
  pollIntervalMs: POLL_INTERVAL_MS,
};
