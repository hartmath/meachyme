import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Use npm: web-push in Deno runtime
// deno-lint-ignore no-explicit-any
const webpush: any = await import('npm:web-push@3.6.0');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipientId, title, body, url } = await req.json();

    const publicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC');
    const privateKey = Deno.env.get('WEB_PUSH_VAPID_PRIVATE');
    const subject = Deno.env.get('WEB_PUSH_SUBJECT') || 'mailto:admin@example.com';

    if (!publicKey || !privateKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Init Supabase service role client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch push subscriptions for the recipient
    const { data: subs, error: subsError } = await supabase
      .from('web_push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', recipientId);

    if (subsError) {
      return new Response(
        JSON.stringify({ success: false, error: subsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No web push subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.default?.setVapidDetails?.(subject, publicKey, privateKey);
    if (webpush.setVapidDetails) webpush.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({ title, body, url });

    const results: unknown[] = [];
    for (const s of subs) {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        const res = await webpush.sendNotification(subscription, payload);
        results.push({ id: s.id, status: 'ok', res: res?.statusCode || 201 });
      } catch (err) {
        // Remove stale subscription
        const msg = String(err?.message || err);
        if (msg.includes('410') || msg.includes('404')) {
          await supabase.from('web_push_subscriptions').delete().eq('id', s.id);
        }
        results.push({ id: s.id, status: 'error', error: msg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});









