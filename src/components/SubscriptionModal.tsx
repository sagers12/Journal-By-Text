import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubscriptionModal = ({ open, onOpenChange }: SubscriptionModalProps) => {
  const { createCheckout, isCreatingCheckout } = useSubscription();

  const handleSubscribe = (plan: 'monthly' | 'yearly') => {
    createCheckout(plan);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center mb-4">Choose Your Plan</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-2 border-slate-200">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Monthly</CardTitle>
              <div className="text-3xl font-bold text-slate-800 mt-2">$4.99</div>
              <div className="text-slate-600">per month</div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 mt-2">
                10-day free trial
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Unlimited SMS entries</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Unlimited photos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Advanced search</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Full export history</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">SMS reminders</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                onClick={() => handleSubscribe('monthly')}
                disabled={isCreatingCheckout}
              >
                {isCreatingCheckout ? 'Processing...' : 'Start Monthly Plan'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 relative">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white">
              BEST VALUE
            </Badge>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Yearly</CardTitle>
              <div className="text-3xl font-bold text-slate-800 mt-2">$39.99</div>
              <div className="text-slate-600">per year</div>
              <div className="text-sm text-green-600 font-medium mt-1">Save $20</div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 mt-2">
                10-day free trial
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Everything in Monthly</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">2 months free</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Bonus features access</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                onClick={() => handleSubscribe('yearly')}
                disabled={isCreatingCheckout}
              >
                {isCreatingCheckout ? 'Processing...' : 'Start Yearly Plan'}
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="text-center text-sm text-slate-600 mt-4">
          <p>No credit card required for trial • Cancel anytime</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};