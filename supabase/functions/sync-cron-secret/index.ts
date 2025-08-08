// Securely sync the X_CRON_SECRET from Edge Function env into the database settings
// This function requires the caller to provide the same X-CRON-SECRET in the request header.
// CORS enabled. No JWT required (verify_jwt = false in config.toml).

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const envSecret = Deno.env.get("X_CRON_SECRET");
  if (!envSecret) {
    return new Response(
      JSON.stringify({ error: "X_CRON_SECRET not configured in Edge Function env" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const provided = req.headers.get("x-cron-secret");
  if (!provided || provided !== envSecret) {
    return new Response(JSON.stringify({ error: "Invalid or missing X-CRON-SECRET" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Supabase URL or service role key missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(url, serviceKey);

  try {
    // Upsert the secret into system_settings so DB cron triggers can include it
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key: "X_CRON_SECRET", value: envSecret })
      .select("key")
      .maybeSingle();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: "X_CRON_SECRET synced to system_settings" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-cron-secret error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
