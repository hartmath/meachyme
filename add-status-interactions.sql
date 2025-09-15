-- Create status_likes table
CREATE TABLE public.status_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id UUID NOT NULL REFERENCES public.status_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(status_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.status_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for status_likes
CREATE POLICY "Users can view all status likes" 
ON public.status_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own status likes" 
ON public.status_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status likes" 
ON public.status_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create status_comments table
CREATE TABLE public.status_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id UUID NOT NULL REFERENCES public.status_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.status_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for status_comments
CREATE POLICY "Users can view all status comments" 
ON public.status_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own status comments" 
ON public.status_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status comments" 
ON public.status_comments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status comments" 
ON public.status_comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create status_shares table
CREATE TABLE public.status_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id UUID NOT NULL REFERENCES public.status_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(status_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.status_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for status_shares
CREATE POLICY "Users can view all status shares" 
ON public.status_shares 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own status shares" 
ON public.status_shares 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status shares" 
ON public.status_shares 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to get status interaction counts
CREATE OR REPLACE FUNCTION get_status_interactions(status_id_param UUID)
RETURNS TABLE (
  like_count BIGINT,
  comment_count BIGINT,
  share_count BIGINT,
  user_liked BOOLEAN,
  user_shared BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((
      SELECT COUNT(*) 
      FROM public.status_likes 
      WHERE status_id = status_id_param
    ), 0) as like_count,
    COALESCE((
      SELECT COUNT(*) 
      FROM public.status_comments 
      WHERE status_id = status_id_param
    ), 0) as comment_count,
    COALESCE((
      SELECT COUNT(*) 
      FROM public.status_shares 
      WHERE status_id = status_id_param
    ), 0) as share_count,
    COALESCE((
      SELECT EXISTS(
        SELECT 1 
        FROM public.status_likes 
        WHERE status_id = status_id_param 
        AND user_id = auth.uid()
      )
    ), false) as user_liked,
    COALESCE((
      SELECT EXISTS(
        SELECT 1 
        FROM public.status_shares 
        WHERE status_id = status_id_param 
        AND user_id = auth.uid()
      )
    ), false) as user_shared;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
