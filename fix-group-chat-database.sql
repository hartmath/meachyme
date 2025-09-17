-- Fix GroupChatDetail.tsx database schema issues

-- Add missing columns to group_messages table
ALTER TABLE group_messages 
ADD COLUMN IF NOT EXISTS attachment_metadata JSONB,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add missing columns to direct_messages table  
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS attachment_metadata JSONB;

-- Add comments to describe the purpose
COMMENT ON COLUMN group_messages.attachment_metadata IS 'Metadata for attachments like duration for voice messages';
COMMENT ON COLUMN group_messages.is_read IS 'Whether the message has been read by the recipient';
COMMENT ON COLUMN direct_messages.attachment_metadata IS 'Metadata for attachments like duration for voice messages';

-- Update existing records to have is_read = false by default
UPDATE group_messages SET is_read = false WHERE is_read IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id_is_read ON group_messages(group_id, is_read);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_id_is_read ON direct_messages(recipient_id, read);
