
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SignUpFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onSignUpSuccess: (phoneNumber: string) => void;
}

export const SignUpForm = ({ loading, setLoading, onSignUpSuccess }: SignUpFormProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  
  const { signUp } = useAuth();
  const { toast } = useToast();

  const consentText = "I authorize Text-2-Journal to send journaling reminders and prompts to the provided phone number using automated means. Message/data rates apply. Message frequency varies. Text HELP for help or STOP to opt out. Consent is not a condition of purchase. See privacy policy.";

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    
    // If it starts with 1, remove it (we'll add +1 later)
    const cleanDigits = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
    
    // Ensure we have exactly 10 digits
    if (cleanDigits.length === 10) {
      return `+1${cleanDigits}`;
    }
    
    return null;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow user to type, but limit to reasonable length
    if (value.replace(/\D/g, '').length <= 11) {
      setPhoneNumber(value);
    }
  };

  const storeSmsConsent = async (userId: string, formattedPhone: string) => {
    try {
      const { error } = await supabase
        .from('sms_consents')
        .insert({
          user_id: userId,
          phone_number: formattedPhone,
          consent_text: consentText,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('Failed to store SMS consent:', error);
      } else {
        console.log('SMS consent recorded successfully');
      }
    } catch (error) {
      console.error('Error storing SMS consent:', error);
    }
  };

  const sendSignupConfirmation = async (formattedPhone: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-signup-confirmation', {
        body: { phoneNumber: formattedPhone }
      });

      if (error) throw error;
      
      console.log('Signup confirmation SMS sent successfully');
    } catch (error) {
      console.error('Error sending signup confirmation:', error);
      // Don't throw here - we don't want to block signup for SMS issues
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!email) {
        throw new Error('Email is required for account creation');
      }
      if (!phoneNumber) {
        throw new Error('Phone number is required for account creation');
      }
      if (!smsConsent) {
        throw new Error('You must agree to receive SMS messages to use SMS Journal');
      }
      
      // Format and validate phone number
      const formattedPhone = formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new Error('Please enter a valid 10-digit US phone number');
      }
      
      // Get user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const { data, error } = await signUp(email, password, formattedPhone, userTimezone);
      if (error) {
        // Handle specific error for duplicate phone number
        if (error.message.includes('duplicate key value violates unique constraint "profiles_phone_number_unique"')) {
          throw new Error('This phone number is already registered with another account. Please use a different phone number or sign in to your existing account.');
        }
        throw error;
      }
      
      // Store SMS consent record after successful signup
      if (data.user?.id) {
        await storeSmsConsent(data.user.id, formattedPhone);
        
        // Send signup confirmation SMS
        await sendSignupConfirmation(formattedPhone);
      }
      
      onSignUpSuccess(formattedPhone);
      toast({
        title: "Account created!",
        description: "We've sent a confirmation message to your phone. Please reply YES to start journaling via SMS."
      });
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div>
        <Label htmlFor="signup-email">Email</Label>
        <Input 
          id="signup-email" 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="your@email.com" 
          required 
        />
        <p className="text-xs text-slate-500 mt-1">
          Used for account verification and recovery
        </p>
      </div>
      <div>
        <Label htmlFor="signup-phone">Phone Number</Label>
        <Input 
          id="signup-phone" 
          type="tel" 
          value={phoneNumber} 
          onChange={handlePhoneChange} 
          placeholder="5551234567" 
          required
        />
        <p className="text-xs text-slate-500 mt-1">
          Enter your 10-digit US phone number (we'll automatically add +1). Each phone number can only be used for one account.
        </p>
      </div>
      <div className="flex items-start space-x-2">
        <Checkbox 
          id="sms-consent" 
          checked={smsConsent}
          onCheckedChange={(checked) => setSmsConsent(checked === true)}
        />
        <div className="grid gap-1.5 leading-none">
          <Label 
            htmlFor="sms-consent"
            className="text-sm font-normal leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I authorize Text-2-Journal to send journaling reminders and prompts to the provided phone number using automated means. Message/data rates apply. Message frequency varies. Text HELP for help or STOP to opt out. Consent is not a condition of purchase. See{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline">
              privacy policy
            </Link>
            .
          </Label>
        </div>
      </div>
      <div>
        <Label htmlFor="signup-password">Password</Label>
        <Input 
          id="signup-password" 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
          minLength={6} 
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account...' : 'Sign Up'}
      </Button>
    </form>
  );
};
