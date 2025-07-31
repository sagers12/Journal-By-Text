-- Fix the date calculation in get_next_prompt_for_user function
CREATE OR REPLACE FUNCTION public.get_next_prompt_for_user(user_uuid uuid)
 RETURNS TABLE(prompt_id uuid, prompt_text text, category text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  user_baseline_date date;
  days_since_baseline integer;
  cycle_day integer;
  target_category text;
  category_order text[] := ARRAY[
    'Self-Reflection',
    'Mindfulness & Presence', 
    'Relationships',
    'Gratitude',
    'Goal Setting',
    'Emotional Awareness',
    'Creativity & Imagination',
    'Healing & Letting Go',
    'Legacy & Meaning',
    'Faith & Spirituality'
  ];
BEGIN
  -- Get user's baseline date (use profile creation date)
  SELECT DATE(created_at) INTO user_baseline_date
  FROM profiles 
  WHERE id = user_uuid;
  
  -- If no profile found, use today as baseline
  IF user_baseline_date IS NULL THEN
    user_baseline_date := CURRENT_DATE;
  END IF;
  
  -- Calculate how many days since baseline (fixed calculation)
  days_since_baseline := (CURRENT_DATE - user_baseline_date);
  
  -- Calculate which day of the 10-day cycle (1-10)
  cycle_day := (days_since_baseline % 10) + 1;
  
  -- Get the target category for this cycle day
  target_category := category_order[cycle_day];
  
  -- If user has used all prompts in this category, reset their history for this category
  IF NOT EXISTS (
    SELECT 1 FROM journal_prompts jp
    WHERE jp.is_active = true 
      AND jp.category = target_category
      AND jp.id NOT IN (
        SELECT uph.prompt_id 
        FROM user_prompt_history uph 
        WHERE uph.user_id = user_uuid
      )
  ) THEN
    -- Reset history for this specific category
    DELETE FROM user_prompt_history 
    WHERE user_id = user_uuid 
      AND prompt_id IN (
        SELECT jp.id FROM journal_prompts jp 
        WHERE jp.category = target_category
      );
  END IF;
  
  -- Return a random unused prompt from the target category
  RETURN QUERY
  SELECT jp.id, jp.prompt_text, jp.category
  FROM journal_prompts jp
  WHERE jp.is_active = true
    AND jp.category = target_category
    AND jp.id NOT IN (
      SELECT uph.prompt_id 
      FROM user_prompt_history uph 
      WHERE uph.user_id = user_uuid
    )
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- If no prompt was returned (shouldn't happen with the reset logic above), 
  -- fall back to any available prompt
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT jp.id, jp.prompt_text, jp.category
    FROM journal_prompts jp
    WHERE jp.is_active = true
      AND jp.category = target_category
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;
END;
$$;