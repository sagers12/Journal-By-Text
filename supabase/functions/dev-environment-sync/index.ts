import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { detectEdgeFunctionEnvironment, getEnvironmentSpecificSupabase, logEnvironmentInfo } from '../_shared/environment.ts';

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
    const { supabase, envConfig } = await getEnvironmentSpecificSupabase(req);
    logEnvironmentInfo(envConfig, 'dev-environment-sync');

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    // This function helps sync development environment data
    // It can be used to copy production schema to dev or reset dev data
    
    const { action, confirm } = await req.json();
    
    if (!confirm) {
      return new Response(
        JSON.stringify({
          error: 'Confirmation required',
          message: 'This is a destructive operation. Set confirm: true to proceed.'
        }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        }
      );
    }

    let result: any = {};

    switch (action) {
      case 'check_dev_environment':
        // Check if dev environment is properly configured
        result = {
          environment: envConfig.environment,
          dev_supabase_configured: !!(
            Deno.env.get('DEV_SUPABASE_URL') && 
            Deno.env.get('DEV_SUPABASE_SERVICE_ROLE_KEY')
          ),
          current_supabase_url: envConfig.supabaseUrl,
          timestamp: new Date().toISOString()
        };
        break;

      case 'reset_dev_data':
        if (!envConfig.isDevelopment) {
          throw new Error('This action can only be performed in development environment');
        }
        
        // Reset development data (clear test entries, reset counters, etc.)
        const { error: deleteError } = await supabase
          .from('journal_entries')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Don't delete non-existent record
        
        if (deleteError) throw deleteError;
        
        result = {
          action: 'reset_dev_data',
          status: 'completed',
          message: 'Development data cleared',
          timestamp: new Date().toISOString()
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result, null, 2),
      {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );

  } catch (error) {
    console.error('Dev environment sync error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Sync operation failed',
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