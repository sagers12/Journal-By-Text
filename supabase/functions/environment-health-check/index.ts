import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('🔧 Edge Function: environment-health-check');

    // Perform system health checks
    const healthCheck = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      status: 'healthy',
      checks: {
        supabase_connection: 'pending',
        secrets_available: {
          SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
          SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        }
      }
    };

    // Test Supabase connection
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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