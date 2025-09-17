-- Create shared_event_links table for event link sharing and event creation
CREATE TABLE IF NOT EXISTS public.shared_event_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_link TEXT, -- Made optional for created events
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'shared_link' CHECK (event_type IN ('shared_link', 'created_event')),
  event_date TIMESTAMP WITH TIME ZONE,
  event_location TEXT,
  event_category TEXT,
  max_attendees INTEGER,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to existing table if they don't exist
ALTER TABLE public.shared_event_links 
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'shared_link',
ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_location TEXT,
ADD COLUMN IF NOT EXISTS event_category TEXT,
ADD COLUMN IF NOT EXISTS max_attendees INTEGER,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add constraint for event_type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'shared_event_links_event_type_check'
    ) THEN
        ALTER TABLE public.shared_event_links 
        ADD CONSTRAINT shared_event_links_event_type_check 
        CHECK (event_type IN ('shared_link', 'created_event'));
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.shared_event_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view all shared event links" ON public.shared_event_links;
DROP POLICY IF EXISTS "Users can create their own event links" ON public.shared_event_links;
DROP POLICY IF EXISTS "Users can update their own event links" ON public.shared_event_links;
DROP POLICY IF EXISTS "Users can delete their own event links" ON public.shared_event_links;

CREATE POLICY "Users can view all shared event links" ON public.shared_event_links FOR SELECT USING (true);
CREATE POLICY "Users can create their own event links" ON public.shared_event_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own event links" ON public.shared_event_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own event links" ON public.shared_event_links FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_event_links_user_id ON public.shared_event_links(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_event_links_created_at ON public.shared_event_links(created_at DESC);

-- Create trigger for updated_at (drop existing one first)
DROP TRIGGER IF EXISTS update_shared_event_links_updated_at ON public.shared_event_links;
CREATE TRIGGER update_shared_event_links_updated_at 
  BEFORE UPDATE ON public.shared_event_links 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

