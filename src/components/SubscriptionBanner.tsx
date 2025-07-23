import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Crown, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionModal } from './SubscriptionModal';

export const SubscriptionBanner = () => {
  const { 
    subscription, 
    isTrialActive, 
    isSubscribed, 
    trialDaysLeft, 
    openCustomerPortal,
    isOpeningPortal 
  } = useSubscription();
  const [showModal, setShowModal] = useState(false);

  if (!subscription) return null;

  // Show trial banner
  if (isTrialActive) {
    return (
      <>
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Free Trial Active</h3>
                  <p className="text-sm text-slate-600">
                    {trialDaysLeft} days remaining • Upgrade anytime
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
        <SubscriptionModal open={showModal} onOpenChange={setShowModal} />
      </>
    );
  }

  // Show subscription status for paid users
  if (isSubscribed) {
    return (
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800">Active Subscription</h3>
                  <Badge className="bg-green-100 text-green-700">
                    {subscription.subscription_tier}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">
                  {subscription.subscription_end && 
                    `Renews ${new Date(subscription.subscription_end).toLocaleDateString()}`
                  }
                </p>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={() => openCustomerPortal()}
              disabled={isOpeningPortal}
            >
              {isOpeningPortal ? 'Opening...' : 'Manage Billing'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show upgrade prompt for expired trial
  return (
    <>
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Trial Expired</h3>
                <p className="text-sm text-slate-600">
                  Upgrade to continue journaling unlimited
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              Upgrade Now
            </Button>
          </div>
        </CardContent>
      </Card>
      <SubscriptionModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
};