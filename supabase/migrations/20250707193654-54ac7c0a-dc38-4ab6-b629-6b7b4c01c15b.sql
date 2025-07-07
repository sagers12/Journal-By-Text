-- Add reminder settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN reminder_enabled boolean DEFAULT true,
ADD COLUMN reminder_time time DEFAULT '20:00:00',
ADD COLUMN reminder_timezone text DEFAULT 'America/New_York';

-- Create table for journal prompts with categories
CREATE TABLE public.journal_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_text text NOT NULL,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table to track which prompts each user has received
CREATE TABLE public.user_prompt_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  prompt_id uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, prompt_id)
);

-- Enable RLS on new tables
ALTER TABLE public.journal_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prompt_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for journal_prompts (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view active prompts" 
ON public.journal_prompts 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

-- RLS policies for user_prompt_history (users can only see their own history)
CREATE POLICY "Users can view their own prompt history" 
ON public.user_prompt_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompt history" 
ON public.user_prompt_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updating journal_prompts updated_at
CREATE TRIGGER update_journal_prompts_updated_at
BEFORE UPDATE ON public.journal_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get next prompt for user
CREATE OR REPLACE FUNCTION public.get_next_prompt_for_user(user_uuid uuid)
RETURNS TABLE(prompt_id uuid, prompt_text text, category text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_prompts integer;
  used_prompts integer;
BEGIN
  -- Count total active prompts
  SELECT COUNT(*) INTO total_prompts 
  FROM journal_prompts 
  WHERE is_active = true;
  
  -- Count prompts this user has received
  SELECT COUNT(*) INTO used_prompts 
  FROM user_prompt_history 
  WHERE user_id = user_uuid;
  
  -- If user has received all prompts, reset their history
  IF used_prompts >= total_prompts THEN
    DELETE FROM user_prompt_history WHERE user_id = user_uuid;
  END IF;
  
  -- Return a random prompt the user hasn't received
  RETURN QUERY
  SELECT jp.id, jp.prompt_text, jp.category
  FROM journal_prompts jp
  WHERE jp.is_active = true
    AND jp.id NOT IN (
      SELECT uph.prompt_id 
      FROM user_prompt_history uph 
      WHERE uph.user_id = user_uuid
    )
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$;