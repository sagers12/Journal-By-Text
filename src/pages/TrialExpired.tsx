import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { Clock, CreditCard } from "lucide-react";

export default function TrialExpired() {
  const { createCheckout, isCreatingCheckout } = useSubscription();

  const handleUpgradeMonthly = () => {
    createCheckout('monthly');
  };

  const handleUpgradeYearly = () => {
    createCheckout('yearly');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Trial Expired
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-gray-600">
            <p className="mb-4">
              Hey, it looks like your trial has expired! Upgrade to a paid plan to continue journaling and to access your previously created journal entries.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleUpgradeYearly}
              disabled={isCreatingCheckout}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isCreatingCheckout ? "Processing..." : "Upgrade to Yearly ($79.99/year)"}
            </Button>
            
            <Button
              onClick={handleUpgradeMonthly}
              disabled={isCreatingCheckout}
              variant="outline"
              className="w-full"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isCreatingCheckout ? "Processing..." : "Upgrade to Monthly ($7.99/month)"}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Choose the plan that works best for you!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}