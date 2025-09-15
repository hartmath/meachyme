// Enhanced badge system that works better with App Creator 24 and web wrappers

export const updateAppBadge = (count: number) => {
  // Method 1: Try native Badge API (works in some browsers/apps)
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        navigator.setAppBadge(count);
      } else {
        navigator.clearAppBadge();
      }
    } catch (error) {
      console.log('Badge API not supported:', error);
    }
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
    } catch (error) {
      console.log('Could not send badge update to parent:', error);
    }
  }

  // Method 5: Store in localStorage for persistence
  localStorage.setItem('app_badge_count', count.toString());
};

export const updateDocumentTitle = (count: number) => {
  const baseTitle = 'Chyme';
  if (count === 0) {
    document.title = baseTitle;
  } else {
    document.title = `(${count}) ${baseTitle}`;
  }
};

export const updateFaviconBadge = (count: number) => {
  if (count === 0) {
    // Reset to original favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = '/favicon.ico';
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
    } else {
      // Create new favicon link if it doesn't exist
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = dataURL;
      document.head.appendChild(link);
    }
  };

  img.src = '/favicon.ico';
};

// Initialize badge from localStorage on page load
export const initializeBadge = () => {
  const storedCount = localStorage.getItem('app_badge_count');
  if (storedCount) {
    const count = parseInt(storedCount, 10);
    if (!isNaN(count)) {
      updateAppBadge(count);
    }
  }
};
