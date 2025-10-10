// Service Worker for caching static assets
const CACHE_NAME = 'chyme-v1';
const STATIC_CACHE = 'chyme-static-v1';
const DYNAMIC_CACHE = 'chyme-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Enable navigation preload for faster first paint
        if ('navigationPreload' in self.registration) {
          self.registration.navigationPreload.enable();
        }
        return self.clients.claim();
      })
  );
});

// Support skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle web push notifications
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Notification';
    const options = {
      body: data.body || '',
      icon: data.icon || '/favicon.ico',
      data: data.data || {},
      badge: data.badge,
      tag: data.tag || `push-${Date.now()}`
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // Fallback if payload is not JSON
    event.waitUntil(self.registration.showNotification('Notification', { body: '' }));
  }
});

self.addEventListener('notificationclick', (event) => {
  const url = event.notification?.data?.url || '/';
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests and explicitly bypass Supabase domains
  if (url.origin !== location.origin) {
    // Explicitly bypass caching/handling for Supabase API and assets
    if (url.hostname.endsWith('.supabase.co')) {
      return; // let the network handle it directly
    }
    return;
  }

  // Handle different types of requests
  if (request.destination === 'document') {
    // For HTML pages, try network first, then cache
    event.respondWith(
      (async () => {
        // Try to use navigation preload response if available
        const preload = await event.preloadResponse;
        if (preload) {
          const clone = preload.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return preload;
        }
        return fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              // Fallback to index.html for SPA routing
              return caches.match('/');
            });
        });
      })()
    );
  } else if (request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {
    // For static assets, try cache first, then network
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle offline actions when connection is restored
      handleBackgroundSync()
    );
  }
});

async function handleBackgroundSync() {
  // This would handle queued actions when the user comes back online
  console.log('Background sync triggered');
}