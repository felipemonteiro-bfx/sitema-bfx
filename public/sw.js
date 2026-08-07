// CACHE_NAME e estampado AUTOMATICAMENTE no build por scripts/stamp-sw.mjs,
// que troca 'bfx-manager-dev' pelo BUILD_ID unico do Next. Nao bumpar a mao.
// Cada deploy vira um cache novo -> o handler 'activate' abaixo apaga os
// caches antigos sozinho (evita "deployei mas o site nao atualiza").
const CACHE_NAME = 'bfx-manager-dev';

// Assets to pre-cache on install
const PRECACHE = ['/dashboard', '/venda-rapida', '/offline'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(PRECACHE.map((url) => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, non-same-origin, and API requests (always network-first)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;

  // Payload RSC do App Router: e o que a navegacao client-side, o prefetch de
  // <Link> e o router.refresh() buscam. Sao GET de mesma origem para /dashboard,
  // /historico etc., com mode 'cors' (nao 'navigate'), entao caiam no cache-first
  // la embaixo e a tela continuava mostrando o dado velho depois de cada acao —
  // so F5 (que e 'navigate') ou limpar o cache resolvia. Nunca cachear isto.
  if (request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) return;

  // Navigation requests: network-first, fall back to cache or offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline'))
        )
    );
    return;
  }

  // Static assets: cache-first — apenas o que e de fato estatico. Antes esta regra
  // valia para todo GET restante, o que arrastava documento e dado dinamico para
  // dentro do cache.
  const ESTATICOS = ['image', 'style', 'script', 'font'];
  if (!ESTATICOS.includes(request.destination)) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
    )
  );
});
