-- Fix the security issue by recreating the function with a secure search_path
DROP FUNCTION IF EXISTS public.get_next_prompt_for_user(uuid);

CREATE OR REPLACE FUNCTION public.get_next_prompt_for_user(user_uuid uuid)
RETURNS TABLE(prompt_id uuid, prompt_text text, category text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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