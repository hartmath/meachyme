import { supabase } from '@/integrations/supabase/client';

export const testSupabaseConnection = async () => {
  const results: any = {};

  try {
    // Test 1: Basic connection
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    results.session = {
      success: !sessionError,
      error: sessionError?.message,
      hasSession: !!session
    };

    // Test 2: Test REST API
    const { data: restData, error: restError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    results.rest = {
      success: !restError,
      error: restError?.message,
      data: restData
    };

    // Test 3: Test auth endpoint specifically
    try {
      const response = await fetch('https://behddityjbiumdcgattw.supabase.co/auth/v1/user', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlaGRkaXR5amJpdW1kY2dhdHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Mzg0NDQsImV4cCI6MjA3MzQxNDQ0NH0.NG9I7gbKhdsGL_UzB5fbgtuiFseu8-3QZ3usbNDge08',
          'Authorization': `Bearer ${session?.access_token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlaGRkaXR5amJpdW1kY2dhdHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Mzg0NDQsImV4cCI6MjA3MzQxNDQ0NH0.NG9I7gbKhdsGL_UzB5fbgtuiFseu8-3QZ3usbNDge08'}`
        }
      });
      
      results.authEndpoint = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (authError: any) {
      results.authEndpoint = {
        success: false,
        error: authError.message
      };
    }

    // Test 4: Check project status
    try {
      const response = await fetch('https://behddityjbiumdcgattw.supabase.co/rest/v1/', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlaGRkaXR5amJpdW1kY2dhdHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Mzg0NDQsImV4cCI6MjA3MzQxNDQ0NH0.NG9I7gbKhdsGL_UzB5fbgtuiFseu8-3QZ3usbNDge08'
        }
      });
      
      results.projectStatus = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (projectError: any) {
      results.projectStatus = {
        success: false,
        error: projectError.message
      };
    }

  } catch (error: any) {
    results.generalError = error.message;
  }

  return results;
};
