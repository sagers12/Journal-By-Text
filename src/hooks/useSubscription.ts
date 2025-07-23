import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  is_trial: boolean;
  trial_end: string | null;
}

export const useSubscription = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: async (): Promise<SubscriptionStatus> => {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (plan: 'monthly' | 'yearly') => {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    },
    onError: (error) => {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    }
  });

  const customerPortalMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Open customer portal in a new tab
      window.open(data.url, '_blank');
    },
    onError: (error) => {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    }
  });

  const refreshSubscription = () => {
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    refetch();
  };

  // Helper functions
  const isTrialActive = subscription?.is_trial && 
    subscription?.trial_end && 
    new Date(subscription.trial_end) > new Date();

  const isSubscribed = subscription?.subscribed || false;

  // User has access if they have an active subscription OR an active trial
  // Once someone subscribes, is_trial becomes false, so no double trial
  const hasAccess = isSubscribed || isTrialActive;

  const trialDaysLeft = subscription?.trial_end 
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    subscription,
    isLoading,
    createCheckout: createCheckoutMutation.mutate,
    openCustomerPortal: customerPortalMutation.mutate,
    refreshSubscription,
    isTrialActive,
    isSubscribed,
    hasAccess,
    trialDaysLeft,
    isCreatingCheckout: createCheckoutMutation.isPending,
    isOpeningPortal: customerPortalMutation.isPending,
  };
};