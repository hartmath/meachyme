-- Create calls table for managing call records
CREATE TABLE public.calls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    call_type VARCHAR(10) NOT NULL CHECK (call_type IN ('voice', 'video')),
    status VARCHAR(20) NOT NULL DEFAULT 'calling' CHECK (status IN ('calling', 'answered', 'declined', 'missed', 'ended')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Create policies for call access
CREATE POLICY "Users can view their own calls" 
ON public.calls 
FOR SELECT 
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create calls they initiate" 
ON public.calls 
FOR INSERT 
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update calls they are part of" 
ON public.calls 
FOR UPDATE 
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_calls_updated_at
BEFORE UPDATE ON public.calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_calls_caller_id ON public.calls(caller_id);
CREATE INDEX idx_calls_callee_id ON public.calls(callee_id);
CREATE INDEX idx_calls_status ON public.calls(status);
CREATE INDEX idx_calls_started_at ON public.calls(started_at DESC);