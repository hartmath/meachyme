// Debug utilities for troubleshooting data fetching issues

export const debugLog = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[DEBUG] ${message}`, data);
  }
};

export const debugError = (message: string, error: any) => {
  if (import.meta.env.DEV) {
    console.error(`[DEBUG ERROR] ${message}`, error);
  }
};

export const debugQuery = (queryKey: string, status: string, data?: any, error?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[QUERY DEBUG] ${queryKey}:`, {
      status,
      dataLength: Array.isArray(data) ? data.length : data ? 1 : 0,
      error: error?.message || null,
      timestamp: new Date().toISOString()
    });
  }
};

export const debugAuth = (user: any, session: any) => {
  if (import.meta.env.DEV) {
    console.log('[AUTH DEBUG]', {
      hasUser: !!user,
      hasSession: !!session,
      userId: user?.id,
      userEmail: user?.email,
      sessionExpiry: session?.expires_at,
      timestamp: new Date().toISOString()
    });
  }
};

export const debugSupabase = (operation: string, result: any, error?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[SUPABASE DEBUG] ${operation}:`, {
      success: !error,
      dataLength: Array.isArray(result?.data) ? result.data.length : result?.data ? 1 : 0,
      error: error?.message || result?.error?.message || null,
      timestamp: new Date().toISOString()
    });
  }
};
