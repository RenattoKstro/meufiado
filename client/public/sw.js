// Worker de aposentadoria: substitui o sw.js antigo, não intercepta requisições
// e se remove após ativar para que o aplicativo não funcione como PWA em cache.
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    await self.registration.unregister();

    const openWindows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    await Promise.all(
      openWindows.map(client => client.navigate(client.url).catch(() => undefined)),
    );
  })());
});
