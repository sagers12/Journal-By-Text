-- Improve category rotation logic to ensure all categories are used before repeating
-- This replaces the existing get_next_prompt_for_user function with better rotation logic

CREATE OR REPLACE FUNCTION public.get_next_prompt_for_user(user_uuid uuid)
 RETURNS TABLE(prompt_id uuid, prompt_text text, category text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  total_prompts integer;
  used_prompts integer;
  total_categories integer;
  used_categories_in_cycle integer;
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
  
  -- Count total distinct categories
  SELECT COUNT(DISTINCT category) INTO total_categories
  FROM journal_prompts
  WHERE is_active = true;
  
  -- Count how many distinct categories have been used in the current cycle
  -- We determine cycle by looking at the most recent prompts sent
  SELECT COUNT(DISTINCT jp.category) INTO used_categories_in_cycle
  FROM user_prompt_history uph
  JOIN journal_prompts jp ON uph.prompt_id = jp.id
  WHERE uph.user_id = user_uuid
    AND uph.sent_at >= (
      SELECT COALESCE(
        (SELECT sent_at 
         FROM user_prompt_history uph2
         JOIN journal_prompts jp2 ON uph2.prompt_id = jp2.id
         WHERE uph2.user_id = user_uuid
         GROUP BY jp2.category
         HAVING COUNT(*) >= 1
         ORDER BY MAX(uph2.sent_at) ASC
         LIMIT 1
         OFFSET GREATEST(0, total_categories - 1)
        ),
        '1900-01-01'::timestamp with time zone
      )
    );
  
  -- If we've used all categories in current cycle, we can use any category
  -- Otherwise, only use categories not yet used in current cycle
  IF used_categories_in_cycle >= total_categories THEN
    -- All categories used, can pick from any category with unused prompts
    SELECT array_agg(DISTINCT jp.category) INTO available_categories
    FROM journal_prompts jp
    WHERE jp.is_active = true
      AND jp.id NOT IN (
        SELECT uph.prompt_id 
        FROM user_prompt_history uph 
        WHERE uph.user_id = user_uuid
      );
  ELSE
    -- Get categories not yet used in current cycle
    SELECT array_agg(DISTINCT jp.category) INTO available_categories
    FROM journal_prompts jp
    WHERE jp.is_active = true
      AND jp.id NOT IN (
        SELECT uph.prompt_id 
        FROM user_prompt_history uph 
        WHERE uph.user_id = user_uuid
      )
      AND jp.category NOT IN (
        -- Exclude categories already used in current cycle
        SELECT DISTINCT jp2.category
        FROM user_prompt_history uph2
        JOIN journal_prompts jp2 ON uph2.prompt_id = jp2.id
        WHERE uph2.user_id = user_uuid
          AND uph2.sent_at >= (
            SELECT COALESCE(
              (SELECT sent_at 
               FROM user_prompt_history uph3
               JOIN journal_prompts jp3 ON uph3.prompt_id = jp3.id
               WHERE uph3.user_id = user_uuid
               GROUP BY jp3.category
               HAVING COUNT(*) >= 1
               ORDER BY MAX(uph3.sent_at) ASC
               LIMIT 1
               OFFSET GREATEST(0, total_categories - 1)
              ),
              '1900-01-01'::timestamp with time zone
            )
          )
      );
  END IF;
  
  -- If no categories available, fallback to any category with unused prompts
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