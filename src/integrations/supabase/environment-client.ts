// Environment-aware Supabase client with fail-closed security
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getEnvironmentConfig } from '@/config/environment';

// Get environment-specific configuration - will throw if invalid
const envConfig = getEnvironmentConfig();

// Create environment-aware Supabase client
export const supabase = createClient<Database>(
  envConfig.SUPABASE_URL,
  envConfig.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
);

// Export environment info for debugging
export const supabaseEnvironmentInfo = {
  environment: envConfig.environment,
  url: envConfig.SUPABASE_URL,
  isDevelopment: envConfig.isDevelopment,
  isProduction: envConfig.isProduction,
};

// Environment logging
console.log(`🌐 Supabase client initialized for ${envConfig.environment.toUpperCase()} environment`);
console.log('📊 Environment Info:', {
  environment: envConfig.environment,
  url: envConfig.SUPABASE_URL,
  isDevelopment: envConfig.isDevelopment,
});