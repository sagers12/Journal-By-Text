import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { detectEdgeFunctionEnvironment, logEnvironmentInfo } from '../_shared/environment.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const envConfig = detectEdgeFunctionEnvironment(req);
    logEnvironmentInfo(envConfig, 'environment-health-check');

    // Perform environment-specific health checks
    const healthCheck = {
      timestamp: new Date().toISOString(),
      environment: envConfig.environment,
      supabaseUrl: envConfig.supabaseUrl,
      status: 'healthy',
      checks: {
        environment_detection: 'pass',
        supabase_connection: 'pending',
        secrets_available: {
          SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
          SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
          DEV_SUPABASE_URL: !!Deno.env.get('DEV_SUPABASE_URL'),
          DEV_SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('DEV_SUPABASE_SERVICE_ROLE_KEY'),
        }
      },
      dev_environment_ready: !!(
        envConfig.isDevelopment && 
        Deno.env.get('DEV_SUPABASE_URL') && 
        Deno.env.get('DEV_SUPABASE_SERVICE_ROLE_KEY')
      )
    };

    // Test Supabase connection
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabaseUrl = envConfig.isDevelopment 
        ? (Deno.env.get('DEV_SUPABASE_URL') || Deno.env.get('SUPABASE_URL'))
        : Deno.env.get('SUPABASE_URL');
      const supabaseKey = envConfig.isDevelopment
        ? (Deno.env.get('DEV_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
        : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      const supabase = createClient(supabaseUrl!, supabaseKey!);
      
      // Test connection with a simple query
      const { error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        healthCheck.checks.supabase_connection = `error: ${error.message}`;
        healthCheck.status = 'degraded';
      } else {
        healthCheck.checks.supabase_connection = 'pass';
      }
    } catch (error) {
      healthCheck.checks.supabase_connection = `error: ${error.message}`;
      healthCheck.status = 'degraded';
    }

    return new Response(
      JSON.stringify(healthCheck, null, 2),
      {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );

  } catch (error) {
    console.error('Environment health check error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Health check failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }
});