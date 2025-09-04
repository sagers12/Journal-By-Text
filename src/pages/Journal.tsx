
import { JournalDashboard } from '@/components/JournalDashboard';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { useSEO } from '@/hooks/useSEO';
import { useEffect } from 'react';

const Journal = () => {
  const { refreshSubscription } = useSubscription();
  const { toast } = useToast();

  useSEO({
    title: "Journal - Journal By Text",
    description: "View and manage your SMS journal entries. Access your personal journaling space and search through your entries.",
    noIndex: true
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');
    const canceled = urlParams.get('canceled');

    if (success === 'true' && sessionId) {
      // Clear the stored session ID
      localStorage.removeItem('stripe_checkout_session_id');
      // Refresh subscription status
      refreshSubscription();
      // Show success message
      toast({
        title: "Subscription activated!",
        description: "Welcome to SMS Journal! Your subscription is now active.",
      });
      // Clean up URL parameters
      window.history.replaceState({}, '', '/journal');
    } else if (canceled === 'true') {
      toast({
        title: "Checkout canceled",
        description: "No changes were made to your subscription.",
        variant: "destructive",
      });
      // Clean up URL parameters
      window.history.replaceState({}, '', '/journal');
    }
  }, [refreshSubscription, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-6">
        <SubscriptionBanner />
      </div>
      <JournalDashboard />
    </div>
  );
};

export default Journal;
