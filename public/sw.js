// Service Worker for Chyme App
// Handles push notifications and badge updates

const CACHE_NAME = 'chyme-v1';
const urlsToCache = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/mea-logo.jpg'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch((error) => {
          console.error('Failed to cache some resources:', error);
          // Continue with installation even if some resources fail to cache
        });
      })
      .then(() => {
        // Force activation of the new service worker
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip requests to external domains
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Fetch from network with error handling
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response for caching
            const responseToCache = networkResponse.clone();

            // Cache the response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.error('Fetch failed:', error);
            // Return a fallback response for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/') || new Response('Offline', { status: 503 });
            }
            throw error;
          });
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'Chyme',
    body: 'You have a new message',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'chyme-notification',
    data: {}
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData
      };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  
  // Handle different notification types
  if (notificationData.type === 'message' && notificationData.chatId) {
    event.waitUntil(
      clients.openWindow(`/chat/${notificationData.chatId}`)
    );
  } else if (notificationData.type === 'group_message' && notificationData.groupId) {
    event.waitUntil(
      clients.openWindow(`/chat/group/${notificationData.groupId}`)
    );
  } else {
    // Default: open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync for offline message handling
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      console.log('Background sync triggered')
    );
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'BADGE_UPDATE') {
    const count = event.data.count || 0;
    console.log('Updating badge count to:', count);
    
    // Update app badge count
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count);
        console.log('Badge set to:', count);
      } else {
        navigator.clearAppBadge();
        console.log('Badge cleared');
      }
    } else {
      console.log('Badge API not available in service worker');
    }
    
    // Also try to update all clients
    event.waitUntil(
      clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'BADGE_UPDATE',
            count: count
          });
        });
      })
    );
  } else if (event.data && event.data.type === 'SET_BADGE') {
    // Legacy support
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(event.data.count);
    }
  } else if (event.data && event.data.type === 'CLEAR_BADGE') {
    // Legacy support
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge();
    }
  }
});
