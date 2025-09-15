// Utility functions for updating favicon with notification badge

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

export const updateDocumentTitle = (count: number) => {
  const baseTitle = 'Chyme';
  if (count === 0) {
    document.title = baseTitle;
  } else {
    document.title = `(${count}) ${baseTitle}`;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('Notification permission denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const showBrowserNotification = (title: string, body: string, icon?: string) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      tag: 'chyme-notification'
    });
  }
};
