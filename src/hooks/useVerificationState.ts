import { useReducer, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type VerificationState = 
  | 'INITIAL'
  | 'AWAITING_VERIFICATION'
  | 'VERIFICATION_SUCCESS'
  | 'VERIFICATION_ERROR'
  | 'VERIFICATION_TIMEOUT'
  | 'USER_VERIFIED';

interface VerificationStateData {
  state: VerificationState;
  error: string | null;
  authLink: string | null;
  attemptCount: number;
  lastAttemptTime: number | null;
  timeoutMs: number;
}

type VerificationAction =
  | { type: 'START_VERIFICATION' }
  | { type: 'VERIFICATION_SUCCESS'; authLink: string }
  | { type: 'VERIFICATION_ERROR'; error: string }
  | { type: 'VERIFICATION_TIMEOUT' }
  | { type: 'USER_VERIFIED' }
  | { type: 'RETRY_VERIFICATION' };

const INITIAL_STATE: VerificationStateData = {
  state: 'INITIAL',
  error: null,
  authLink: null,
  attemptCount: 0,
  lastAttemptTime: null,
  timeoutMs: 10 * 60 * 1000, // 10 minutes
};

function verificationReducer(state: VerificationStateData, action: VerificationAction): VerificationStateData {
  switch (action.type) {
    case 'START_VERIFICATION':
      return {
        ...state,
        state: 'AWAITING_VERIFICATION',
        error: null,
        attemptCount: state.attemptCount + 1,
        lastAttemptTime: Date.now(),
      };
    
    case 'VERIFICATION_SUCCESS':
      return {
        ...state,
        state: 'VERIFICATION_SUCCESS',
        authLink: action.authLink,
        error: null,
      };
    
    case 'VERIFICATION_ERROR':
      return {
        ...state,
        state: 'VERIFICATION_ERROR',
        error: action.error,
      };
    
    case 'VERIFICATION_TIMEOUT':
      return {
        ...state,
        state: 'VERIFICATION_TIMEOUT',
        error: 'Verification timeout - please try again',
      };
    
    case 'USER_VERIFIED':
      return {
        ...state,
        state: 'USER_VERIFIED',
        error: null,
      };
    
    case 'RETRY_VERIFICATION':
      return {
        ...state,
        state: 'INITIAL',
        error: null,
      };
    
    default:
      return state;
  }
}

interface UseVerificationStateProps {
  verificationToken: string | null;
  userId?: string;
  onVerificationSuccess?: (authLink: string) => void;
  onTimeout?: () => void;
}

export const useVerificationState = ({
  verificationToken,
  userId,
  onVerificationSuccess,
  onTimeout,
}: UseVerificationStateProps) => {
  const [state, dispatch] = useReducer(verificationReducer, INITIAL_STATE);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>();

  // Calculate retry delay with exponential backoff
  const getRetryDelay = (attemptCount: number) => {
    return Math.min(1000 * Math.pow(2, attemptCount - 1), 30000); // Max 30 seconds
  };

  const attemptVerification = useCallback(async () => {
    if (!verificationToken || state.state === 'VERIFICATION_SUCCESS') return;

    dispatch({ type: 'START_VERIFICATION' });

    try {
      const { data, error } = await supabase.functions.invoke('verify-and-signin', {
        body: { verification_token: verificationToken }
      });

      if (error) {
        console.error('Verification failed:', error);
        dispatch({ type: 'VERIFICATION_ERROR', error: error.message || 'Verification failed' });
        
        // Schedule retry with exponential backoff
        if (state.attemptCount < 5) { // Max 5 attempts
          const delay = getRetryDelay(state.attemptCount);
          retryTimeoutRef.current = setTimeout(() => {
            attemptVerification();
          }, delay);
        }
        return;
      }

      if (data?.success && data?.auth_link) {
        console.log('Verification successful');
        dispatch({ type: 'VERIFICATION_SUCCESS', authLink: data.auth_link });
        onVerificationSuccess?.(data.auth_link);
        
        toast({
          title: "Phone verified!",
          description: "Signing you in..."
        });
      } else {
        // Verification not ready yet, this is normal
        console.log('Verification not ready yet');
      }
    } catch (error) {
      console.error('Error during verification:', error);
      dispatch({ type: 'VERIFICATION_ERROR', error: 'Network error - please check your connection' });
    }
  }, [verificationToken, state.attemptCount, onVerificationSuccess, toast]);

  // Set up real-time subscription for phone verification
  useEffect(() => {
    if (!userId) return;

    console.log('Setting up real-time subscription for user:', userId);
    
    const channel = supabase
      .channel('phone-verification')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          // Check if phone was verified
          if (payload.new?.phone_verified === true && payload.old?.phone_verified !== true) {
            console.log('Phone verification detected via real-time');
            dispatch({ type: 'USER_VERIFIED' });
            
            // Now attempt to get the auth link
            attemptVerification();
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, attemptVerification]);

  // Set up verification timeout
  useEffect(() => {
    if (state.state === 'AWAITING_VERIFICATION') {
      timeoutRef.current = setTimeout(() => {
        dispatch({ type: 'VERIFICATION_TIMEOUT' });
        onTimeout?.();
      }, state.timeoutMs);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state.state, state.timeoutMs, onTimeout]);

  // Initial verification attempt
  useEffect(() => {
    if (verificationToken && state.state === 'INITIAL') {
      // Small delay to allow real-time subscription to set up
      const timer = setTimeout(() => {
        attemptVerification();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [verificationToken, state.state, attemptVerification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const retry = useCallback(() => {
    dispatch({ type: 'RETRY_VERIFICATION' });
  }, []);

  return {
    state: state.state,
    error: state.error,
    authLink: state.authLink,
    attemptCount: state.attemptCount,
    isVerifying: state.state === 'AWAITING_VERIFICATION',
    isSuccess: state.state === 'VERIFICATION_SUCCESS' || state.state === 'USER_VERIFIED',
    isError: state.state === 'VERIFICATION_ERROR',
    isTimeout: state.state === 'VERIFICATION_TIMEOUT',
    retry,
  };
};