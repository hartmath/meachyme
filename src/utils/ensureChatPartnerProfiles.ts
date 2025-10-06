import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures that all users who have sent or received messages have profiles
 * This is useful for migrating existing data where users might not have profiles yet
 */
export async function ensureChatPartnerProfiles() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No authenticated user' };

    // Get all messages involving the current user
    const { data: messages, error: msgError } = await supabase
      .from('direct_messages')
      .select('sender_id, recipient_id')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

    if (msgError) throw msgError;

    // Get unique user IDs from messages
    const userIds = [...new Set([
      ...messages?.map(m => m.sender_id) || [],
      ...messages?.map(m => m.recipient_id) || []
    ])];

    console.log('Checking profiles for users:', userIds);

    // Check which users don't have profiles
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .in('id', userIds);

    const existingProfileIds = new Set(existingProfiles?.map(p => p.id) || []);
    const missingProfileIds = userIds.filter(id => !existingProfileIds.has(id));

    console.log('Users without profiles:', missingProfileIds);

    if (missingProfileIds.length === 0) {
      return { success: true, message: 'All users have profiles', created: 0 };
    }

    // Create basic profiles for users without them
    const profilesToCreate = missingProfileIds.map(userId => ({
      id: userId,
      full_name: `User ${userId.substring(0, 8)}`,
      user_type: 'attendee',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('profiles')
      .insert(profilesToCreate);

    if (insertError) {
      console.error('Error creating profiles:', insertError);
      throw insertError;
    }

    return { 
      success: true, 
      message: `Created ${missingProfileIds.length} missing profiles`, 
      created: missingProfileIds.length 
    };
  } catch (error: any) {
    console.error('Error ensuring chat partner profiles:', error);
    return { success: false, error: error.message };
  }
}
