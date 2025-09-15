// Enhanced badge system that works better with App Creator 24 and web wrappers

export const updateAppBadge = (count: number) => {
  console.log('🔔 updateAppBadge called with count:', count);
  
  // Method 1: Try native Badge API (works in some browsers/apps)
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        navigator.setAppBadge(count);
        console.log('✅ Native badge set:', count);
      } else {
        navigator.clearAppBadge();
        console.log('✅ Native badge cleared');
      }
    } catch (error) {
      console.log('❌ Badge API not supported:', error);
    }
  } else {
    console.log('❌ Badge API not available');
  }

  // Method 2: Update document title (works everywhere)
  updateDocumentTitle(count);

  // Method 3: Update favicon (works everywhere)
  updateFaviconBadge(count);

  // Method 4: Send message to parent window (for App Creator 24)
  if (window.parent !== window) {
    try {
      window.parent.postMessage({
        type: 'BADGE_UPDATE',
        count: count
      }, '*');
      console.log('✅ Parent window notified with count:', count);
    } catch (error) {
      console.log('❌ Could not send badge update to parent:', error);
    }
  } else {
    console.log('❌ No parent window to notify');
  }

  // Method 5: Try to communicate with top window (for iframe scenarios)
  if (window.top !== window) {
    try {
      window.top.postMessage({
        type: 'BADGE_UPDATE',
        count: count
      }, '*');
      console.log('✅ Top window notified with count:', count);
    } catch (error) {
      console.log('❌ Could not send badge update to top window:', error);
    }
  }

  // Method 6: Try to communicate with opener window (for popup scenarios)
  if (window.opener) {
    try {
      window.opener.postMessage({
        type: 'BADGE_UPDATE',
        count: count
      }, '*');
      console.log('✅ Opener window notified with count:', count);
    } catch (error) {
      console.log('❌ Could not send badge update to opener window:', error);
    }
  }

  // Method 7: Use BroadcastChannel for cross-tab communication
  try {
    const channel = new BroadcastChannel('badge-updates');
    channel.postMessage({
      type: 'BADGE_UPDATE',
      count: count
    });
    console.log('✅ BroadcastChannel notified with count:', count);
  } catch (error) {
    console.log('❌ BroadcastChannel not supported:', error);
  }

  // Method 8: Try to update meta tags for app wrappers
  try {
    let metaBadge = document.querySelector('meta[name="badge-count"]');
    if (!metaBadge) {
      metaBadge = document.createElement('meta');
      metaBadge.setAttribute('name', 'badge-count');
      document.head.appendChild(metaBadge);
    }
    metaBadge.setAttribute('content', count.toString());
    console.log('✅ Meta badge updated:', count);
  } catch (error) {
    console.log('❌ Could not update meta badge:', error);
  }

  // Method 9: Try to update data attributes on body
  try {
    document.body.setAttribute('data-badge-count', count.toString());
    console.log('✅ Body data attribute updated:', count);
  } catch (error) {
    console.log('❌ Could not update body data attribute:', error);
  }

  // Method 10: Store in localStorage for persistence
  localStorage.setItem('app_badge_count', count.toString());
  console.log('✅ Badge count stored in localStorage:', count);
};

export const updateDocumentTitle = (count: number) => {
  const baseTitle = 'Chyme';
  if (count === 0) {
    document.title = baseTitle;
    console.log('✅ Document title cleared:', baseTitle);
  } else {
    document.title = `(${count}) ${baseTitle}`;
    console.log('✅ Document title updated:', `(${count}) ${baseTitle}`);
  }
};

export const updateFaviconBadge = (count: number) => {
  console.log('🔔 updateFaviconBadge called with count:', count);
  
  if (count === 0) {
    // Reset to original favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = '/favicon.ico';
      console.log('✅ Favicon reset to original');
    }
    return;
  }

  // Create canvas to draw favicon with badge
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 32;
  canvas.height = 32;

  // Load original favicon
  const img = new Image();
  img.onload = () => {
    // Draw original favicon
    ctx.drawImage(img, 0, 0, 32, 32);

    // Draw badge circle
    const badgeSize = 12;
    const badgeX = 32 - badgeSize - 2;
    const badgeY = 2;

    // Badge background (red circle)
    ctx.fillStyle = '#ef4444'; // red-500
    ctx.beginPath();
    ctx.arc(badgeX + badgeSize/2, badgeY + badgeSize/2, badgeSize/2, 0, 2 * Math.PI);
    ctx.fill();

    // Badge text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const badgeText = count > 99 ? '99+' : count.toString();
    ctx.fillText(badgeText, badgeX + badgeSize/2, badgeY + badgeSize/2);

    // Update favicon
    const dataURL = canvas.toDataURL('image/png');
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = dataURL;
      console.log('✅ Favicon updated with badge:', count);
    } else {
      // Create new favicon link if it doesn't exist
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = dataURL;
      document.head.appendChild(link);
      console.log('✅ New favicon created with badge:', count);
    }
  };

  img.src = '/favicon.ico';
};

// Initialize badge from localStorage on page load
export const initializeBadge = () => {
  console.log('🔔 Initializing badge from localStorage...');
  const storedCount = localStorage.getItem('app_badge_count');
  if (storedCount) {
    const count = parseInt(storedCount, 10);
    if (!isNaN(count)) {
      console.log('✅ Restoring badge count from localStorage:', count);
      updateAppBadge(count);
    } else {
      console.log('❌ Invalid badge count in localStorage:', storedCount);
    }
  } else {
    console.log('❌ No badge count found in localStorage');
  }
};


// Aggressive badge update for app wrappers
export const forceBadgeUpdate = (count: number) => {
  console.log('🚀 Force badge update with count:', count);
  
  // Try all methods multiple times
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      updateAppBadge(count);
    }, i * 100);
  }
  
  // Also try to trigger a page visibility change
  if (document.hidden) {
    document.dispatchEvent(new Event('visibilitychange'));
  }
  
  // Try to focus the window
  if (window.focus) {
    window.focus();
  }
};
