-- Create storage buckets for different types of media uploads

-- Create avatars bucket for profile pictures (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create status-media bucket for status post images/videos (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'status-media',
  'status-media', 
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
);

-- Create event-images bucket for event cover photos (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  10485760, -- 10MB  
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create chat-attachments bucket for file sharing in chats (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  20971520, -- 20MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- RLS Policies for avatars bucket
CREATE POLICY "Users can view all avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policies for status-media bucket  
CREATE POLICY "Users can view all status media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'status-media');

CREATE POLICY "Users can upload their own status media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'status-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own status media" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'status-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own status media" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'status-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policies for event-images bucket
CREATE POLICY "Users can view all event images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-images');

CREATE POLICY "Users can upload their own event images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own event images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own event images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policies for chat-attachments bucket (private - only participants can access)
CREATE POLICY "Users can view chat attachments they have access to" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'chat-attachments' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1] 
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Users can upload chat attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own chat attachments" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);