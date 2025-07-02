import { useEffect, useState } from 'react';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';

export const useTimezone = () => {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id);
  const [userTimezone, setUserTimezone] = useState<string>('UTC');

  useEffect(() => {
    if (profile?.timezone) {
      setUserTimezone(profile.timezone);
    } else {
      // Default to browser timezone if no profile timezone
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(browserTimezone);
    }
  }, [profile]);

  const formatTimeInUserTimezone = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: userTimezone
    });
  };

  const formatDateInUserTimezone = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: userTimezone
    });
  };

  const updateUserTimezone = (timezone: string) => {
    if (user?.id) {
      updateProfile({ timezone });
    }
  };

  return {
    userTimezone,
    formatTimeInUserTimezone,
    formatDateInUserTimezone,
    updateUserTimezone
  };
};