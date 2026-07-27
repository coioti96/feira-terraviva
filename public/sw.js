// ============================================================
// SERVICE WORKER — Feirinha Orgânica Terra Viva
// Cache-first strategy com fallback offline
// ============================================================

const CACHE_NAME = 'terra-viva-v1';
const STATIC_ASSETS = [
  '/',
  '/produtos',
  '/carrinho',
  '/perfil',
  '/pedidos',
  '/icons/maskable_icon_x192.png',
  '/icons/maskable_icon_x512.png',
  '/icons/logo.png',
];

// ── Install: Pré-cache dos assets estáticos ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
      console.warn('[SW] Erro ao pré-cachear:', err);
    })
  );
  self.skipWaiting();
});

// ── Activate: Limpa caches antigos ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: Cache-first para assets, network-first para API ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET
  if (request.method !== 'GET') return;

  // Ignora requisições de analytics/tracking
  if (url.pathname.includes('/api/tracking')) return;

  // API do Supabase: network-first (sempre dados frescos)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cacheia respostas GET bem-sucedidas
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Assets estáticos: cache-first
  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navegação (páginas): stale-while-revalidate
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback offline: retorna cache ou página genérica
            return cached || caches.match('/');
          });

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: network com fallback para cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Push Notifications ──
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Nova notificação da Terra Viva',
    icon: '/icons/maskable_icon_x192.png',
    badge: '/icons/maskable_icon_x96.png',
    tag: data.tag || 'default',
    requireInteraction: false,
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Terra Viva',
      options
    )
  );
});

// ── Notification Click ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Foca em uma aba existente se possível
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Abre nova aba
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// ── Background Sync (para pedidos offline) ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  // Implementação futura: sincroniza pedidos feitos offline
  console.log('[SW] Sincronizando pedidos pendentes...');
}