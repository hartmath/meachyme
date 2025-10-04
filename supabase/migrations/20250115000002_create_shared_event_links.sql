-- Create shared_event_links table for event sharing functionality
CREATE TABLE public.shared_event_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('shared_link', 'created_event')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_link TEXT, -- For shared_link type
  event_date TIMESTAMP WITH TIME ZONE, -- For created_event type
  event_location TEXT, -- For created_event type
  event_category VARCHAR(50), -- For created_event type
  max_attendees INTEGER, -- For created_event type
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shared_event_links ENABLE ROW LEVEL SECURITY;

-- Create policies for shared_event_links
CREATE POLICY "Users can view all shared event links" 
ON public.shared_event_links 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own shared event links" 
ON public.shared_event_links 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shared event links" 
ON public.shared_event_links 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared event links" 
ON public.shared_event_links 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shared_event_links_updated_at
BEFORE UPDATE ON public.shared_event_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_shared_event_links_user_id ON public.shared_event_links(user_id);
CREATE INDEX idx_shared_event_links_event_type ON public.shared_event_links(event_type);
CREATE INDEX idx_shared_event_links_created_at ON public.shared_event_links(created_at DESC);
CREATE INDEX idx_shared_event_links_event_date ON public.shared_event_links(event_date);

-- Create view for event links with profile data
CREATE VIEW public.event_links_with_profiles AS
SELECT 
  sel.*,
  p.full_name,
  p.avatar_url,
  p.user_type,
  p.location as profile_location,
  json_build_object(
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'user_type', p.user_type,
    'location', p.location
  ) as profile_data
FROM public.shared_event_links sel
LEFT JOIN public.profiles p ON sel.user_id = p.user_id
ORDER BY sel.created_at DESC;

-- Enable RLS for the view
ALTER VIEW public.event_links_with_profiles SET (security_invoker = true);
