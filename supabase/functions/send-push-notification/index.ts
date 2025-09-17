import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  to: string
  title: string
  body: string
  data?: any
  sound?: string
  badge?: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipientId, senderName, message, type, callType } = await req.json()

    // Get Expo access token from environment
    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN')
    if (!expoAccessToken) {
      throw new Error('EXPO_ACCESS_TOKEN not configured')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get recipient's push token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('push_token, full_name')
      .eq('user_id', recipientId)
      .single()

    if (profileError || !profile?.push_token) {
      console.log('No push token found for user:', recipientId)
      return new Response(
        JSON.stringify({ success: false, message: 'No push token found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare notification payload
    let notification: NotificationPayload = {
      to: profile.push_token,
      sound: 'default',
      badge: 1,
    }

    // Customize notification based on type
    switch (type) {
      case 'message':
        notification.title = `New message from ${senderName}`
        notification.body = message.length > 100 ? message.substring(0, 100) + '...' : message
        notification.data = {
          type: 'message',
          senderId: recipientId,
          chatId: recipientId
        }
        break

      case 'group_message':
        notification.title = `${senderName} in group`
        notification.body = message.length > 100 ? message.substring(0, 100) + '...' : message
        notification.data = {
          type: 'group_message',
          groupId: recipientId,
          senderName
        }
        break

      case 'call':
        notification.title = `Incoming ${callType} call from ${senderName}`
        notification.body = callType === 'video' ? 'MEA Meet' : 'Voice call'
        notification.sound = 'default'
        notification.data = {
          type: 'call',
          callType,
          callerId: recipientId,
          callerName: senderName
        }
        break

      default:
        notification.title = 'New notification'
        notification.body = message || 'You have a new notification'
    }

    // Send push notification via Expo
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expoAccessToken}`,
      },
      body: JSON.stringify(notification),
    })

    const expoResult = await expoResponse.json()

    if (expoResult.data && expoResult.data[0]?.status === 'ok') {
      console.log('Push notification sent successfully:', expoResult)
      return new Response(
        JSON.stringify({ success: true, data: expoResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.error('Failed to send push notification:', expoResult)
      return new Response(
        JSON.stringify({ success: false, error: expoResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in send-push-notification function:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})