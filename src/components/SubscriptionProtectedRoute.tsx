import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import TrialExpired from '@/pages/TrialExpired';

interface SubscriptionProtectedRouteProps {
  children: React.ReactNode;
}

export const SubscriptionProtectedRoute = ({ children }: SubscriptionProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const { hasAccess, isLoading: subscriptionLoading, subscription } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('SubscriptionProtectedRoute - Auth state:', { 
      loading, 
      hasUser: !!user, 
      hasSession: !!session,
      hasAccess,
      subscriptionLoading,
      subscription
    });
    
    // Only redirect if we're done loading and there's no valid session
    if (!loading && (!user || !session)) {
      console.log('Redirecting to sign-in - missing auth');
      navigate('/sign-in', { replace: true });
    }
  }, [user, session, loading, navigate]);

  // Show loading while auth or subscription state is being determined
  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  // Don't render anything if no auth
  if (!user || !session) {
    return null;
  }

  // Show trial expired page if user doesn't have access
  if (!hasAccess) {
    return <TrialExpired />;
  }

  return <>{children}</>;
};