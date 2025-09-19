// Service Worker for Chyme App
// Handles offline caching, push notifications and badge updates

const CACHE_NAME = 'chyme-v2';
const STATIC_CACHE = 'chyme-static-v2';
const DYNAMIC_CACHE = 'chyme-dynamic-v2';
const isDevelopment = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Resources to cache for offline use
const STATIC_RESOURCES = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/mea-logo.jpg',
  '/placeholder.svg'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  if (isDevelopment) {
    // Skip caching in development
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static resources...');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('Static resources cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event with comprehensive offline support
self.addEventListener('fetch', (event) => {
  if (isDevelopment) {
    // In development, just pass through without caching
    return;
  }
  
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests (except Supabase)
  if (url.origin !== location.origin && !url.hostname.includes('supabase')) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Try to fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Clone the response
            const responseToCache = networkResponse.clone();
            
            // Cache successful responses
            if (networkResponse.status === 200) {
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('Network fetch failed:', error);
            
            // Return offline fallbacks
            if (request.destination === 'document') {
              return caches.match('/');
            }
            
            if (request.destination === 'image') {
              return caches.match('/placeholder.svg');
            }
            
            // Return a basic offline response
            return new Response(
              JSON.stringify({ 
                error: 'Offline', 
                message: 'This content is not available offline' 
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
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
