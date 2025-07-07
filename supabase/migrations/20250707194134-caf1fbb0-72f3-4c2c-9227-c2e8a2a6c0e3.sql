-- Insert all journal prompts organized by category
INSERT INTO public.journal_prompts (prompt_text, category) VALUES 

-- Self-Reflection
('What are three things I''m proud of today?', 'Self-Reflection'),
('How did I feel when I woke up this morning?', 'Self-Reflection'),
('What thoughts are taking up the most space in my mind today?', 'Self-Reflection'),
('What are my current priorities in life?', 'Self-Reflection'),
('What does my ideal day look like?', 'Self-Reflection'),
('What fear is holding me back right now?', 'Self-Reflection'),
('How do I define success for myself?', 'Self-Reflection'),
('What''s one limiting belief I want to let go of?', 'Self-Reflection'),
('How have I grown in the past year?', 'Self-Reflection'),
('What advice would I give my younger self?', 'Self-Reflection'),

-- Gratitude
('What am I most thankful for today?', 'Gratitude'),
('Who in my life am I most grateful for right now, and why?', 'Gratitude'),
('What small thing brought me joy today?', 'Gratitude'),
('What was the best part of my day?', 'Gratitude'),
('Name five things in your home you''re thankful for.', 'Gratitude'),
('What past experience are you grateful for?', 'Gratitude'),
('What challenge am I thankful for?', 'Gratitude'),
('What skill or talent am I grateful to have?', 'Gratitude'),
('What''s a recent moment that made me smile?', 'Gratitude'),
('How has someone helped me recently?', 'Gratitude'),

-- Emotional Awareness
('What emotion am I feeling most strongly today?', 'Emotional Awareness'),
('When was the last time I felt deeply peaceful?', 'Emotional Awareness'),
('What''s something that''s been bothering me and why?', 'Emotional Awareness'),
('How do I typically react to stress?', 'Emotional Awareness'),
('When do I feel most like myself?', 'Emotional Awareness'),
('What do I need emotionally today?', 'Emotional Awareness'),
('What triggers negative emotions for me?', 'Emotional Awareness'),
('When did I last cry, and what was it about?', 'Emotional Awareness'),
('How do I show myself compassion?', 'Emotional Awareness'),
('What''s something I need to forgive myself for?', 'Emotional Awareness'),

-- Goal Setting
('What is one goal I want to accomplish this week?', 'Goal Setting'),
('Where do I want to be in five years?', 'Goal Setting'),
('What habits would I like to build?', 'Goal Setting'),
('What''s something I''ve always wanted to learn?', 'Goal Setting'),
('What is standing between me and my goals?', 'Goal Setting'),
('What''s a short-term goal I''m excited about?', 'Goal Setting'),
('What is one thing I can do today to move closer to my dreams?', 'Goal Setting'),
('What''s something I keep putting off, and why?', 'Goal Setting'),
('What does productivity mean to me?', 'Goal Setting'),
('What motivates me most?', 'Goal Setting'),

-- Relationships
('Who inspires me and why?', 'Relationships'),
('What do I value most in a friend?', 'Relationships'),
('How do I show love to others?', 'Relationships'),
('What''s something I appreciate about my partner/friend/family member?', 'Relationships'),
('What do I need to say to someone, but haven''t yet?', 'Relationships'),
('When do I feel most connected to others?', 'Relationships'),
('What''s a relationship I''d like to strengthen?', 'Relationships'),
('Who do I miss, and why?', 'Relationships'),
('What does a healthy relationship look like to me?', 'Relationships'),
('How do I maintain boundaries in relationships?', 'Relationships'),

-- Faith & Spirituality
('Where do I feel closest to God (or the divine)?', 'Faith & Spirituality'),
('What does faith mean to me today?', 'Faith & Spirituality'),
('How has my spiritual journey changed over time?', 'Faith & Spirituality'),
('What spiritual practice helps me feel grounded?', 'Faith & Spirituality'),
('What Bible verse (or sacred text) speaks to me today?', 'Faith & Spirituality'),
('When do I feel most at peace spiritually?', 'Faith & Spirituality'),
('What do I believe about my purpose?', 'Faith & Spirituality'),
('How do I seek inspiration or divine guidance?', 'Faith & Spirituality'),
('What spiritual questions am I wrestling with?', 'Faith & Spirituality'),
('How can I serve others in faith today?', 'Faith & Spirituality'),

-- Creativity & Imagination
('What would I do if I knew I couldn''t fail?', 'Creativity & Imagination'),
('Write a letter to your future self 10 years from now.', 'Creativity & Imagination'),
('Describe your dream home in detail.', 'Creativity & Imagination'),
('If I were to write a book, what would it be about?', 'Creativity & Imagination'),
('What does my ideal creative life look like?', 'Creativity & Imagination'),
('If I could spend a year anywhere, where would it be and why?', 'Creativity & Imagination'),
('Design a perfect day for someone you love.', 'Creativity & Imagination'),
('Describe a place you''ve never been but long to visit.', 'Creativity & Imagination'),
('What story from my life could be turned into a movie?', 'Creativity & Imagination'),
('Create a new holiday. What''s it called and how is it celebrated?', 'Creativity & Imagination'),

-- Mindfulness & Presence
('What do I hear, see, and feel around me right now?', 'Mindfulness & Presence'),
('What am I doing when I feel most present?', 'Mindfulness & Presence'),
('How can I slow down today?', 'Mindfulness & Presence'),
('What does peace look like to me?', 'Mindfulness & Presence'),
('What activity helps me reset my mind?', 'Mindfulness & Presence'),
('How do I recharge when I feel depleted?', 'Mindfulness & Presence'),
('Describe a moment today you want to remember.', 'Mindfulness & Presence'),
('What distractions do I need to eliminate?', 'Mindfulness & Presence'),
('How does my body feel today?', 'Mindfulness & Presence'),
('What do I need more of, and what do I need less of?', 'Mindfulness & Presence'),

-- Healing & Letting Go
('What pain am I still holding onto?', 'Healing & Letting Go'),
('Who do I need to forgive, and why?', 'Healing & Letting Go'),
('What''s one thing I can release today?', 'Healing & Letting Go'),
('How have I healed from a past hurt?', 'Healing & Letting Go'),
('What boundaries do I need to set?', 'Healing & Letting Go'),
('What habits no longer serve me?', 'Healing & Letting Go'),
('What does self-love mean to me right now?', 'Healing & Letting Go'),
('What am I learning from my struggles?', 'Healing & Letting Go'),
('What am I still grieving?', 'Healing & Letting Go'),
('How can I treat myself with more kindness?', 'Healing & Letting Go'),

-- Legacy & Meaning
('What do I want to be remembered for?', 'Legacy & Meaning'),
('What does a meaningful life look like to me?', 'Legacy & Meaning'),
('What impact do I want to have on others?', 'Legacy & Meaning'),
('What are my core values?', 'Legacy & Meaning'),
('What lessons do I want to pass on?', 'Legacy & Meaning'),
('If I died tomorrow, what would I regret not doing?', 'Legacy & Meaning'),
('How do I define a life well lived?', 'Legacy & Meaning'),
('What does "living with purpose" mean to me?', 'Legacy & Meaning'),
('Who do I admire, and what legacy did they leave?', 'Legacy & Meaning'),
('How can I make today matter?', 'Legacy & Meaning');

-- Update the get_next_prompt_for_user function to handle category rotation
-- Add user_last_prompt_category table to track last category sent
CREATE TABLE public.user_last_prompt_category (
  user_id uuid NOT NULL PRIMARY KEY,
  last_category text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE public.user_last_prompt_category ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_last_prompt_category
CREATE POLICY "Users can view their own last prompt category" 
ON public.user_last_prompt_category 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own last prompt category" 
ON public.user_last_prompt_category 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own last prompt category" 
ON public.user_last_prompt_category 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Drop and recreate the function with category rotation logic
DROP FUNCTION IF EXISTS public.get_next_prompt_for_user(uuid);

CREATE OR REPLACE FUNCTION public.get_next_prompt_for_user(user_uuid uuid)
RETURNS TABLE(prompt_id uuid, prompt_text text, category text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_prompts integer;
  used_prompts integer;
  last_category_used text;
  available_categories text[];
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
    DELETE FROM user_last_prompt_category WHERE user_id = user_uuid;
  END IF;
  
  -- Get the last category sent to this user
  SELECT last_category INTO last_category_used
  FROM user_last_prompt_category
  WHERE user_id = user_uuid;
  
  -- Get available categories (excluding the last one used)
  SELECT array_agg(DISTINCT jp.category) INTO available_categories
  FROM journal_prompts jp
  WHERE jp.is_active = true
    AND jp.id NOT IN (
      SELECT uph.prompt_id 
      FROM user_prompt_history uph 
      WHERE uph.user_id = user_uuid
    )
    AND (last_category_used IS NULL OR jp.category != last_category_used);
  
  -- If no categories available (only last category has unused prompts), allow last category
  IF available_categories IS NULL OR array_length(available_categories, 1) = 0 THEN
    SELECT array_agg(DISTINCT jp.category) INTO available_categories
    FROM journal_prompts jp
    WHERE jp.is_active = true
      AND jp.id NOT IN (
        SELECT uph.prompt_id 
        FROM user_prompt_history uph 
        WHERE uph.user_id = user_uuid
      );
  END IF;
  
  -- Return a random prompt from a random available category
  RETURN QUERY
  SELECT jp.id, jp.prompt_text, jp.category
  FROM journal_prompts jp
  WHERE jp.is_active = true
    AND jp.category = available_categories[floor(random() * array_length(available_categories, 1)) + 1]
    AND jp.id NOT IN (
      SELECT uph.prompt_id 
      FROM user_prompt_history uph 
      WHERE uph.user_id = user_uuid
    )
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$;