-- Update chat-attachments bucket to include audio files
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'image/gif', 
  'video/mp4', 
  'video/webm', 
  'application/pdf', 
  'text/plain', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/ogg',
  'audio/webm'
]
WHERE id = 'chat-attachments';
