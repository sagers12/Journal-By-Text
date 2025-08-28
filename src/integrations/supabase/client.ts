
// Environment-aware Supabase client
// This file now imports from the environment-aware client

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Re-export the environment-aware client for backward compatibility
export { supabase, supabaseEnvironmentInfo } from './environment-client';
