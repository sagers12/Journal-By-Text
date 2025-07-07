import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ReminderSettings } from '@/components/settings/ReminderSettings';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { user } = useAuth();
  const { profile, updateProfile, isUpdating } = useProfile(user?.id);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  // Form state for reminder settings
  const [reminderSettings, setReminderSettings] = useState({
    enabled: true,
    time: '20:00',
    timezone: 'America/New_York'
  });

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setReminderSettings({
        enabled: profile.reminder_enabled ?? true,
        time: profile.reminder_time ?? '20:00',
        timezone: profile.reminder_timezone ?? 'America/New_York'
      });
    }
  }, [profile]);

  // Track unsaved changes
  useEffect(() => {
    if (profile) {
      const hasChanges = 
        reminderSettings.enabled !== (profile.reminder_enabled ?? true) ||
        reminderSettings.time !== (profile.reminder_time ?? '20:00') ||
        reminderSettings.timezone !== (profile.reminder_timezone ?? 'America/New_York');
      
      setHasUnsavedChanges(hasChanges);
    }
  }, [reminderSettings, profile]);

  const handleSave = async () => {
    if (!profile) return;
    
    await updateProfile({
      reminder_enabled: reminderSettings.enabled,
      reminder_time: reminderSettings.time,
      reminder_timezone: reminderSettings.timezone
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigation('/journal')}
            className="flex items-center gap-2"
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
          {/* Reminders Section */}
          <Card>
            <CardHeader>
              <CardTitle>Reminders</CardTitle>
              <CardDescription>
                Configure daily journal reminders to help maintain your journaling habit
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