-- Create status_posts table for user status updates
CREATE TABLE public.status_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT DEFAULT 'text',
  background_color TEXT DEFAULT '#3B82F6',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.status_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for status posts
CREATE POLICY "Users can view all status posts" 
ON public.status_posts 
FOR SELECT 
USING (expires_at > now());

CREATE POLICY "Users can create their own status posts" 
ON public.status_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status posts" 
ON public.status_posts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status posts" 
ON public.status_posts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create status_views table to track who viewed which status
CREATE TABLE public.status_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id UUID NOT NULL REFERENCES public.status_posts(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(status_id, viewer_id)
);

-- Enable RLS for status views
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;

-- Policies for status views
CREATE POLICY "Users can view status view records" 
ON public.status_views 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create status view records" 
ON public.status_views 
FOR INSERT 
WITH CHECK (auth.uid() = viewer_id);

-- Create function to auto-update view count
CREATE OR REPLACE FUNCTION update_status_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.status_posts 
  SET view_count = view_count + 1 
  WHERE id = NEW.status_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for view count updates
CREATE TRIGGER update_status_view_count_trigger
  AFTER INSERT ON public.status_views
  FOR EACH ROW
  EXECUTE FUNCTION update_status_view_count();

-- Add trigger for automatic timestamp updates on status posts
CREATE TRIGGER update_status_posts_updated_at
  BEFORE UPDATE ON public.status_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();