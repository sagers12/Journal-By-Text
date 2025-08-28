// Environment-aware Supabase client
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getEnvironmentConfig } from '@/config/environment';

// Get environment-specific configuration
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

// Development environment warning
if (envConfig.isDevelopment) {
  console.log('🚧 Running in DEVELOPMENT environment');
  console.log('📊 Environment Info:', supabaseEnvironmentInfo);
  
  // Check if dev credentials are placeholder
  if (envConfig.SUPABASE_URL.includes('placeholder')) {
    console.warn('⚠️ Dev Supabase credentials not configured - using placeholder values');
  }
}