// Environment configuration and detection
export type Environment = 'development' | 'production';

export interface EnvironmentConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
}

// Environment detection based on multiple factors
export const detectEnvironment = (): Environment => {
  // Check if we're in Vite development mode
  if (import.meta.env.DEV) {
    return 'development';
  }
  
  // Check hostname patterns
  const hostname = window.location.hostname;
  
  // Development patterns
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('dev') ||
    hostname.includes('staging') ||
    hostname.includes('preview') ||
    hostname.endsWith('.vercel.app') && !hostname.includes('journal-by-text-production')
  ) {
    return 'development';
  }
  
  // Default to production for safety
  return 'production';
};

// Environment-specific configurations
const environments: Record<Environment, Omit<EnvironmentConfig, 'environment' | 'isDevelopment' | 'isProduction'>> = {
  development: {
    // DEV SUPABASE CREDENTIALS - TO BE UPDATED WHEN DEV PROJECT IS READY
    SUPABASE_URL: "https://placeholder-dev.supabase.co", // Will be updated with actual dev URL
    SUPABASE_ANON_KEY: "placeholder-dev-anon-key", // Will be updated with actual dev anon key
  },
  production: {
    // PRODUCTION SUPABASE CREDENTIALS
    SUPABASE_URL: "https://zfxdjbpjxpgreymebpsr.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeGRqYnBqeHBncmV5bWVicHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5ODIxNjAsImV4cCI6MjA2NDU1ODE2MH0.RKIGrOMAEE3DJfjoH-6BmNqeoTrVtd4Ct3yp3tG-Eww",
  },
};

// Get current environment configuration
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const environment = detectEnvironment();
  const config = environments[environment];
  
  return {
    ...config,
    environment,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
  };
};

// Export environment info for debugging
export const environmentInfo = {
  get current() {
    const config = getEnvironmentConfig();
    return {
      environment: config.environment,
      hostname: window.location.hostname,
      origin: window.location.origin,
      isViteDev: import.meta.env.DEV,
      supabaseUrl: config.SUPABASE_URL,
    };
  }
};