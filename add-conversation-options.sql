-- Add pinned and blocked options to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Create index for pinned conversations for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON public.conversations(is_pinned) WHERE is_pinned = true;

-- Create index for blocked conversations
CREATE INDEX IF NOT EXISTS idx_conversations_blocked ON public.conversations(is_blocked) WHERE is_blocked = true;
