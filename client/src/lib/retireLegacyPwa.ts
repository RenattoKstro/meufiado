const LEGACY_PWA_RETIREMENT_RELEASE = "2026.09.02.1";

/**
 * Remove registros e Cache Storage de versões antigas do PWA. Esta rotina não
 * acessa cookies, localStorage, IndexedDB, autenticação ou dados de usuários.
 */
export async function retireLegacyPwa(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const registrations = "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistrations()
      : [];

    const unregisterResults = await Promise.all(
      registrations.map(registration => registration.unregister()),
    );

    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map(cacheName => window.caches.delete(cacheName)));
    }

    // A navegação seguinte deixa de ser controlada pelo worker legado. O marcador
    // impede uma segunda recarga na mesma aba caso o navegador mantenha o controller
    // até a navegação terminar.
    if (unregisterResults.some(Boolean)) {
      const marker = `meu-fiado:pwa-retired:${LEGACY_PWA_RETIREMENT_RELEASE}`;
      if (window.sessionStorage.getItem(marker) !== "done") {
        window.sessionStorage.setItem(marker, "done");
        window.location.reload();
      }
    }
  } catch (error) {
    // Falhas de API do navegador não podem impedir o acesso ao painel.
    console.warn("Não foi possível limpar o cache legado do MeuFiado.", error);
  }
}
