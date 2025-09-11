import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface UseVerificationNavigationProps {
  phoneNumber: string | null;
  verificationToken: string | null;
  authLink: string | null;
  isSuccess: boolean;
  isTimeout: boolean;
}

export const useVerificationNavigation = ({
  phoneNumber,
  verificationToken,
  authLink,
  isSuccess,
  isTimeout,
}: UseVerificationNavigationProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const hasNavigatedRef = useRef(false);

  // Single navigation effect with guards
  useEffect(() => {
    // Prevent multiple navigations
    if (hasNavigatedRef.current) return;

    // Wait for auth state to load
    if (authLoading) return;

    // If user is already authenticated, go to journal
    if (user) {
      console.log('User already authenticated, navigating to journal');
      hasNavigatedRef.current = true;
      navigate('/journal', { replace: true });
      return;
    }

    // If missing required data, go back to signup
    if (!phoneNumber || !verificationToken) {
      console.log('Missing phone number or verification token, redirecting to signup');
      hasNavigatedRef.current = true;
      navigate('/sign-up', { replace: true });
      return;
    }

    // If verification successful and we have auth link, redirect
    if (isSuccess && authLink) {
      console.log('Verification successful, redirecting to auth link');
      hasNavigatedRef.current = true;
      
      // Add a small delay to allow the toast to show
      setTimeout(() => {
        window.location.href = authLink;
      }, 1000);
      return;
    }

    // If verification timed out, redirect to signup with message
    if (isTimeout) {
      console.log('Verification timed out, redirecting to signup');
      hasNavigatedRef.current = true;
      navigate('/sign-up?timeout=true', { replace: true });
      return;
    }
  }, [
    authLoading,
    user,
    phoneNumber,
    verificationToken,
    isSuccess,
    authLink,
    isTimeout,
    navigate,
  ]);

  return {
    hasNavigated: hasNavigatedRef.current,
  };
};