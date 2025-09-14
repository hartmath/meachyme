-- Create groups table for group chat functionality
CREATE TABLE public.groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table to track group membership
CREATE TABLE public.group_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- Create group_messages table for group chat messages
CREATE TABLE public.group_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups table
CREATE POLICY "Users can view groups they are members of" 
ON public.groups 
FOR SELECT 
USING (
    id IN (
        SELECT group_id 
        FROM public.group_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update their groups" 
ON public.groups 
FOR UPDATE 
USING (
    auth.uid() = created_by 
    OR auth.uid() IN (
        SELECT user_id 
        FROM public.group_members 
        WHERE group_id = id AND role = 'admin'
    )
);

CREATE POLICY "Group admins can delete their groups" 
ON public.groups 
FOR DELETE 
USING (
    auth.uid() = created_by 
    OR auth.uid() IN (
        SELECT user_id 
        FROM public.group_members 
        WHERE group_id = id AND role = 'admin'
    )
);

-- RLS Policies for group_members table (simplified to avoid circular references)
CREATE POLICY "Users can view their own group memberships" 
ON public.group_members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can join groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" 
ON public.group_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for group_messages table (simplified)
CREATE POLICY "Users can view their own messages" 
ON public.group_messages 
FOR SELECT 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can send messages to groups they created" 
ON public.group_messages 
FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id 
    AND group_id IN (
        SELECT id 
        FROM public.groups 
        WHERE created_by = auth.uid()
    )
);

CREATE POLICY "Users can update their own messages" 
ON public.group_messages 
FOR UPDATE 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" 
ON public.group_messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_messages_updated_at
BEFORE UPDATE ON public.group_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_groups_created_by ON public.groups(created_by);
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX idx_group_messages_created_at ON public.group_messages(created_at DESC);

-- Insert some sample groups for testing
INSERT INTO public.groups (name, description, created_by) VALUES
('Event Coordinators', 'A group for event coordinators to share ideas and collaborate', (SELECT id FROM auth.users LIMIT 1)),
('Wedding Planners Network', 'Connect with wedding planners and share resources', (SELECT id FROM auth.users LIMIT 1)),
('Tech Conference Team', 'Team coordination for tech conferences', (SELECT id FROM auth.users LIMIT 1));

-- Add the creator as admin for each group
INSERT INTO public.group_members (group_id, user_id, role)
SELECT g.id, g.created_by, 'admin'
FROM public.groups g;

-- Add some sample members to groups (using existing users)
INSERT INTO public.group_members (group_id, user_id, role)
SELECT g.id, u.id, 'member'
FROM public.groups g
CROSS JOIN auth.users u
WHERE u.id != g.created_by
LIMIT 5;

-- Create group_calls table for group video/audio calls
CREATE TABLE public.group_calls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    call_type VARCHAR(10) NOT NULL CHECK (call_type IN ('voice', 'video')),
    status VARCHAR(20) NOT NULL DEFAULT 'calling' CHECK (status IN ('calling', 'active', 'ended')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_call_participants table to track who's in the call
CREATE TABLE public.group_call_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES public.group_calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(call_id, user_id)
);

-- Enable Row Level Security for group calls
ALTER TABLE public.group_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_call_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_calls table (simplified)
CREATE POLICY "Users can view calls they initiated" 
ON public.group_calls 
FOR SELECT 
USING (auth.uid() = initiator_id);

CREATE POLICY "Users can create group calls" 
ON public.group_calls 
FOR INSERT 
WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Users can update calls they initiated" 
ON public.group_calls 
FOR UPDATE 
USING (auth.uid() = initiator_id);

-- RLS Policies for group_call_participants table (simplified)
CREATE POLICY "Users can view their own call participation" 
ON public.group_call_participants 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can join group calls" 
ON public.group_call_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
ON public.group_call_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_group_calls_updated_at
BEFORE UPDATE ON public.group_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_group_calls_group_id ON public.group_calls(group_id);
CREATE INDEX idx_group_calls_initiator_id ON public.group_calls(initiator_id);
CREATE INDEX idx_group_calls_status ON public.group_calls(status);
CREATE INDEX idx_group_call_participants_call_id ON public.group_call_participants(call_id);
CREATE INDEX idx_group_call_participants_user_id ON public.group_call_participants(user_id);
CREATE INDEX idx_group_call_participants_is_active ON public.group_call_participants(is_active);
