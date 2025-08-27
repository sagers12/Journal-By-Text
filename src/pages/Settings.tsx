import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ReminderSettings } from '@/components/settings/ReminderSettings';
import { ArrowLeft, Crown, Clock, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { user } = useAuth();
  const { profile, updateProfile, isUpdating } = useProfile(user?.id);
  const { 
    subscription, 
    isTrialActive, 
    isSubscribed, 
    trialDaysLeft, 
    openCustomerPortal,
    isOpeningPortal 
  } = useSubscription();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  // Form state for reminder settings
  const [reminderSettings, setReminderSettings] = useState({
    enabled: true,
    time: '20:00',
    timezone: 'America/New_York',
    weeklyRecapEnabled: true
  });

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setReminderSettings({
        enabled: profile.reminder_enabled ?? true,
        time: profile.reminder_time ?? '20:00',
        timezone: profile.reminder_timezone ?? 'America/New_York',
        weeklyRecapEnabled: profile.weekly_recap_enabled ?? true
      });
    }
  }, [profile]);

  // Track unsaved changes
  useEffect(() => {
    if (profile) {
      const hasChanges = 
        reminderSettings.enabled !== (profile.reminder_enabled ?? true) ||
        reminderSettings.time !== (profile.reminder_time ?? '20:00') ||
        reminderSettings.timezone !== (profile.reminder_timezone ?? 'America/New_York') ||
        reminderSettings.weeklyRecapEnabled !== (profile.weekly_recap_enabled ?? true);
      
      setHasUnsavedChanges(hasChanges);
    }
  }, [reminderSettings, profile]);

  const handleSave = async () => {
    if (!profile) return;
    
    await updateProfile({
      reminder_enabled: reminderSettings.enabled,
      reminder_time: reminderSettings.time,
      reminder_timezone: reminderSettings.timezone,
      weekly_recap_enabled: reminderSettings.weeklyRecapEnabled
    });
    
    setHasUnsavedChanges(false);
  };

  const handleNavigation = (path: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
      setShowExitDialog(true);
    } else {
      window.location.href = path;
    }
  };

  const handleSaveAndExit = async () => {
    await handleSave();
    if (pendingNavigation) {
      window.location.href = pendingNavigation;
    }
    setShowExitDialog(false);
  };

  const handleDiscardAndExit = () => {
    if (pendingNavigation) {
      window.location.href = pendingNavigation;
    }
    setShowExitDialog(false);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigation('/journal')}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Journal
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Customize your journal experience</p>
          </div>
        </div>

        {/* Settings Content */}
        <div className="space-y-6">
          {/* Billing Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Subscription
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription && (
                <>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {isSubscribed ? (
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Crown className="w-5 h-5 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {isSubscribed ? 'Active Subscription' : isTrialActive ? 'Free Trial' : 'No Active Subscription'}
                          </h4>
                          {isSubscribed && subscription.subscription_tier && (
                            <Badge className="bg-green-100 text-green-700">
                              {subscription.subscription_tier}
                            </Badge>
                          )}
                          {isTrialActive && (
                            <Badge className="bg-blue-100 text-blue-700">
                              Trial
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isSubscribed && subscription.subscription_end ? (
                            `Next billing date: ${new Date(subscription.subscription_end).toLocaleDateString()}`
                          ) : isTrialActive ? (
                            `${trialDaysLeft} days remaining`
                          ) : (
                            'Subscribe to unlock unlimited journaling'
                          )}
                        </p>
                      </div>
                    </div>
                    {isSubscribed && (
                      <Button 
                        variant="outline"
                        onClick={() => openCustomerPortal()}
                        disabled={isOpeningPortal}
                      >
                        {isOpeningPortal ? 'Opening...' : 'Manage Billing'}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Automated Messages Section */}
          <Card>
            <CardHeader>
              <CardTitle>Automated Messages</CardTitle>
              <CardDescription>
                Configure automated text messages to help maintain your journaling habit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReminderSettings
                settings={reminderSettings}
                onChange={setReminderSettings}
              />
            </CardContent>
          </Card>

          {/* Save/Cancel Actions */}
          <div className="flex justify-end gap-4 pt-6">
            <Button
              variant="outline"
              onClick={() => handleNavigation('/journal')}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save your settings?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to save your settings before exiting?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleDiscardAndExit}
              variant="outline"
            >
              No, do not save
            </Button>
            <AlertDialogAction onClick={handleSaveAndExit}>
              Yes, save and exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}