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

  // Don't show banner for active subscribers
  if (isSubscribed) {
    return null;
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