
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePhoneVerification = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const { toast } = useToast();

  const sendVerificationCode = async (phoneNumber: string) => {
    setIsLoading(true);
    try {
      // Call edge function to send verification SMS
      const { data, error } = await supabase.functions.invoke('send-verification', {
        body: { phoneNumber }
      });

      if (error) throw error;

      setVerificationSent(true);
      toast({
        title: "Verification code sent",
        description: `We've sent a verification code to ${phoneNumber}`,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error sending verification:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async (phoneNumber: string, code: string) => {
    setIsLoading(true);
    try {
      // Call edge function to verify code
      const { data, error } = await supabase.functions.invoke('verify-phone', {
        body: { phoneNumber, code }
      });

      if (error) throw error;

      toast({
        title: "Phone verified!",
        description: "Your phone number has been successfully verified.",
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendVerificationCode,
    verifyCode,
    isLoading,
    verificationSent,
    setVerificationSent
  };
};
