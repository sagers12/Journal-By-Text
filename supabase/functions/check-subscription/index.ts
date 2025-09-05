import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check trial status first
    const { data: subscriber } = await supabaseClient
      .from("subscribers")
      .select("*")
      .eq("email", user.email)
      .single();

    const isTrialActive = subscriber?.is_trial && 
      subscriber?.trial_end && 
      new Date(subscriber.trial_end) > new Date();

    logStep("Trial status checked", { 
      isTrialActive, 
      trialEnd: subscriber?.trial_end,
      currentSubscribed: subscriber?.subscribed 
    });

    // If trial is active, return trial status
    if (isTrialActive) {
      return new Response(JSON.stringify({
        subscribed: false,
        is_trial: true,
        trial_end: subscriber.trial_end,
        subscription_tier: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        is_trial: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        is_trial: false,
        trial_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount || 0;
      
      if (amount <= 500) {
        subscriptionTier = "Monthly";
      } else {
        subscriptionTier = "Yearly";
      }
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd, tier: subscriptionTier });
    } else {
      logStep("No active subscription found");
    }

    // Get current subscriber data to check if this is their first subscription
    const { data: currentSubscriber } = await supabaseClient
      .from("subscribers")
      .select("first_subscription_date, subscribed")
      .eq("email", user.email)
      .single();

    // Prepare the update object
    const updateData: any = {
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      is_trial: hasActiveSub ? false : undefined, // Once subscribed, no longer on trial
      updated_at: new Date().toISOString(),
    };

    // Only set first_subscription_date if:
    // 1. User is newly subscribing (hasActiveSub = true)
    // 2. They don't already have a first_subscription_date
    // 3. They weren't previously subscribed
    if (hasActiveSub && 
        (!currentSubscriber?.first_subscription_date) && 
        (!currentSubscriber?.subscribed)) {
      updateData.first_subscription_date = new Date().toISOString();
      logStep("Setting first_subscription_date for new subscriber", { email: user.email });
    }

    await supabaseClient.from("subscribers").upsert(updateData, { onConflict: 'email' });

    logStep("Updated database with subscription info", { subscribed: hasActiveSub, subscriptionTier });
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      is_trial: false,
      trial_end: null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});