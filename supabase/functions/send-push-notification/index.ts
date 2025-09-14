import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client
const supabaseUrl = 'https://behddityjbiumdcgattw.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get EXPO_ACCESS_TOKEN from database or environment
let EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN");

// If not in environment, try to get from database
if (!EXPO_ACCESS_TOKEN) {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'EXPO_ACCESS_TOKEN')
      .single();
    
    if (!error && data) {
      EXPO_ACCESS_TOKEN = data.value;
    }
  } catch (error) {
    console.error('Error fetching EXPO_ACCESS_TOKEN from database:', error);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, title, body, data }: PushNotificationRequest = await req.json();

    if (!EXPO_ACCESS_TOKEN) {
      throw new Error("EXPO_ACCESS_TOKEN not configured");
    }

    // Send push notification via Expo Push API
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        title,
        body,
        data,
        sound: "default",
        badge: 1,
      }),
    });

    const result = await response.json();
    console.log("Push notification sent:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);