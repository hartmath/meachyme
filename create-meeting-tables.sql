-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  participant_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meeting_participants table
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(meeting_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meetings_host_id ON meetings(host_id);
CREATE INDEX IF NOT EXISTS idx_meetings_is_active ON meetings(is_active);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for meetings
CREATE POLICY "Users can view meetings they are part of" ON meetings
  FOR SELECT USING (
    host_id = auth.uid() OR 
    id IN (
      SELECT meeting_id FROM meeting_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create meetings" ON meetings
  FOR INSERT WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update their meetings" ON meetings
  FOR UPDATE USING (host_id = auth.uid());

CREATE POLICY "Hosts can delete their meetings" ON meetings
  FOR DELETE USING (host_id = auth.uid());

-- Create RLS policies for meeting_participants
CREATE POLICY "Users can view participants of meetings they are part of" ON meeting_participants
  FOR SELECT USING (
    user_id = auth.uid() OR 
    meeting_id IN (
      SELECT id FROM meetings WHERE host_id = auth.uid()
    )
  );

CREATE POLICY "Users can join meetings" ON meeting_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" ON meeting_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can leave meetings" ON meeting_participants
  FOR DELETE USING (user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_meetings_updated_at 
  BEFORE UPDATE ON meetings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update participant count
CREATE OR REPLACE FUNCTION update_meeting_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE meetings 
    SET participant_count = participant_count + 1 
    WHERE id = NEW.meeting_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE meetings 
    SET participant_count = participant_count - 1 
    WHERE id = OLD.meeting_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update participant count
CREATE TRIGGER update_meeting_participant_count_trigger
  AFTER INSERT OR DELETE ON meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_participant_count();
