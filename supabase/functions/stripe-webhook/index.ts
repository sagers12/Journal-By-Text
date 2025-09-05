import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Event verified", { type: event.type, id: event.id });

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        if (!customer.email) {
          throw new Error("Customer email not found");
        }

        // Determine subscription tier based on price amount
        let subscriptionTier = "Monthly";
        if (subscription.items.data.length > 0) {
          const price = subscription.items.data[0].price;
          const amount = price.unit_amount || 0;
          if (amount >= 3000) {
            subscriptionTier = "Yearly";
          } else {
            subscriptionTier = "Monthly";
          }
        }

        // Get existing subscriber to check if this is a resubscription
        const { data: existingSubscriber } = await supabaseClient
          .from("subscribers")
          .select('user_id, subscribed, first_subscription_date')
          .eq('email', customer.email)
          .single();

        const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const isResubscription = existingSubscriber && !existingSubscriber.subscribed && subscription.status === 'active';
        
        const { error } = await supabaseClient
          .from("subscribers")
          .upsert({
            email: customer.email,
            stripe_customer_id: customer.id,
            subscribed: subscription.status === 'active',
            subscription_tier: subscriptionTier,
            subscription_end: subscriptionEnd,
            first_subscription_date: existingSubscriber?.first_subscription_date || (subscription.status === 'active' ? new Date().toISOString() : undefined),
            is_trial: false, // No longer on trial once subscribed
            updated_at: new Date().toISOString(),
          }, { onConflict: 'email' });

        if (error) throw error;

        // Record subscription event
        if (existingSubscriber?.user_id && subscription.status === 'active') {
          const eventType = isResubscription ? 'resubscribed' : 'subscribed';
          const { error: eventError } = await supabaseClient
            .from('subscription_events')
            .insert({
              user_id: existingSubscriber.user_id,
              event_type: eventType,
              subscription_tier: subscriptionTier,
              stripe_subscription_id: subscription.id,
              event_date: new Date().toISOString()
            });

          if (eventError) {
            logStep('Error recording subscription event', { error: eventError });
          } else {
            logStep('Subscription event recorded', { eventType, userId: existingSubscriber.user_id });
          }
        }

        logStep("Subscription updated", { email: customer.email, tier: subscriptionTier });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        if (!customer.email) {
          throw new Error("Customer email not found");
        }

        // Get subscriber info for event recording
        const { data: cancelledSubscriber } = await supabaseClient
          .from("subscribers")
          .select('user_id, subscription_tier')
          .eq('email', customer.email)
          .single();

        // Set subscription_end to the cancellation date (preserve for duration calculations)
        const cancellationDate = new Date().toISOString();
        const { error } = await supabaseClient
          .from("subscribers")
          .upsert({
            email: customer.email,
            stripe_customer_id: customer.id,
            subscribed: false,
            subscription_tier: null,
            subscription_end: cancellationDate, // Keep the cancellation date instead of null
            is_trial: false, // They had a subscription, so no more trial
            updated_at: cancellationDate,
          }, { onConflict: 'email' });

        if (error) throw error;

        // Record cancellation event
        if (cancelledSubscriber?.user_id) {
          const { error: eventError } = await supabaseClient
            .from('subscription_events')
            .insert({
              user_id: cancelledSubscriber.user_id,
              event_type: 'cancelled',
              subscription_tier: cancelledSubscriber.subscription_tier,
              stripe_subscription_id: subscription.id,
              event_date: cancellationDate
            });

          if (eventError) {
            logStep('Error recording cancellation event', { error: eventError });
          } else {
            logStep('Cancellation event recorded', { userId: cancelledSubscriber.user_id });
          }
        }

        logStep("Subscription cancelled", { email: customer.email });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer && invoice.subscription) {
          const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
          
          if (customer.email) {
            // Mark as unsubscribed on payment failure
            const { error } = await supabaseClient
              .from("subscribers")
              .update({
                subscribed: false,
                updated_at: new Date().toISOString(),
              })
              .eq('email', customer.email);

            if (error) throw error;
            logStep("Payment failed, subscription deactivated", { email: customer.email });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Webhook error", { error: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});