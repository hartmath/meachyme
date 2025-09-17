// Cache utility functions to help with persistent cache issues

export const clearAllCaches = () => {
  try {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear IndexedDB if it exists
    if ('indexedDB' in window) {
      indexedDB.databases?.().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
    
    // Clear service worker cache
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    console.log('All caches cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing caches:', error);
    return false;
  }
};

export const clearSupabaseCache = () => {
  try {
    // Clear Supabase specific localStorage items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('Supabase cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing Supabase cache:', error);
    return false;
  }
};

export const clearReactQueryCache = () => {
  try {
    // This will be called from the component that has access to queryClient
    console.log('React Query cache should be cleared');
    return true;
  } catch (error) {
    console.error('Error clearing React Query cache:', error);
    return false;
  }
};
