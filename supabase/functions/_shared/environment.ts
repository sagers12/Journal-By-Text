// Environment detection and configuration for edge functions
// This utility helps edge functions determine which environment they're serving

interface EnvironmentConfig {
  environment: 'development' | 'production';
  supabaseUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

export const detectEdgeFunctionEnvironment = (request: Request): EnvironmentConfig => {
  const url = new URL(request.url);
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  
  // Check if request is coming from development environment
  const isDevelopment = 
    // Local development
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    // Vercel preview deployments (but not production)
    (origin.includes('.vercel.app') && !origin.includes('journal-by-text-production')) ||
    // Development domain patterns
    origin.includes('dev') ||
    origin.includes('staging') ||
    origin.includes('preview') ||
    referer.includes('localhost') ||
    referer.includes('dev') ||
    referer.includes('staging');

  const environment = isDevelopment ? 'development' : 'production';
  
  return {
    environment,
    supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
    isDevelopment,
    isProduction: !isDevelopment,
  };
};

export const getEnvironmentSpecificSupabase = async (request: Request) => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const envConfig = detectEdgeFunctionEnvironment(request);
  
  // In development, we'll use dev-specific Supabase when available
  // For now, both environments use the same Supabase until dev is fully configured
  const supabaseUrl = envConfig.isDevelopment 
    ? (Deno.env.get('DEV_SUPABASE_URL') || Deno.env.get('SUPABASE_URL'))
    : Deno.env.get('SUPABASE_URL');
    
  const supabaseKey = envConfig.isDevelopment
    ? (Deno.env.get('DEV_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  return { supabase, envConfig };
};

export const logEnvironmentInfo = (envConfig: EnvironmentConfig, functionName: string) => {
  console.log(`🔧 Edge Function: ${functionName}`);
  console.log(`🌐 Environment: ${envConfig.environment}`);
  console.log(`📍 Supabase URL: ${envConfig.supabaseUrl}`);
  
  if (envConfig.isDevelopment) {
    console.log('🚧 Running in DEVELOPMENT mode');
  }
};