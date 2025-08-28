// Environment configuration using Vite environment variables
export type Environment = 'development' | 'production';

export interface EnvironmentConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
}

// Validate required environment variables
const validateEnvironmentVariables = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
    );
  }
  
  if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
    throw new Error(
      'Environment variables contain placeholder values. Please set proper Supabase credentials.'
    );
  }
  
  return { supabaseUrl, supabaseAnonKey };
};

// Simple environment detection
export const detectEnvironment = (): Environment => {
  return import.meta.env.DEV ? 'development' : 'production';
};

// Get current environment configuration - fail closed approach
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const environment = detectEnvironment();
  const { supabaseUrl, supabaseAnonKey } = validateEnvironmentVariables();
  
  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    environment,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
  };
};

// Export environment info for debugging
export const environmentInfo = {
  get current() {
    try {
      const config = getEnvironmentConfig();
      return {
        environment: config.environment,
        hostname: window.location.hostname,
        origin: window.location.origin,
        isViteDev: import.meta.env.DEV,
        supabaseUrl: config.SUPABASE_URL,
        hasValidCredentials: true,
      };
    } catch (error) {
      return {
        environment: 'unknown',
        hostname: window.location.hostname,
        origin: window.location.origin,
        isViteDev: import.meta.env.DEV,
        supabaseUrl: 'INVALID',
        hasValidCredentials: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
};