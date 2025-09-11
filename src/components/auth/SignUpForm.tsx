import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useTimezone } from '@/hooks/useTimezone';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCSRFToken } from '@/components/CSRFToken';
import { sanitizeInput, detectSuspiciousActivity, logSecurityEvent, checkClientRateLimit } from '@/utils/securityMonitoring';
import { Eye, EyeOff } from 'lucide-react';

interface SignUpFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onSignUpSuccess: (phoneNumber: string, verificationToken: string, redirectTo: string) => void;
}

export const SignUpForm = ({ loading, setLoading, onSignUpSuccess }: SignUpFormProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { toast } = useToast();
  const { userTimezone } = useTimezone();
  const { csrfToken, validateAndRefreshToken } = useCSRFToken();

  // Keep verification token in memory only
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const sendSignupConfirmation = async (formattedPhone: string): Promise<void> => {
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Client-side input sanitization
      const sanitizedEmail = sanitizeInput(email, 254);
      const sanitizedPhone = sanitizeInput(phoneNumber, 15);
      
      // Check for suspicious activity
      if (detectSuspiciousActivity(email) || detectSuspiciousActivity(phoneNumber)) {
        logSecurityEvent({
          event_type: 'suspicious_signup_attempt',
          identifier: email,
          details: { email: sanitizedEmail, phone: sanitizedPhone },
          severity: 'high'
        });
        toast({
          title: "Invalid input detected",
          description: "Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Client-side rate limiting check
      const rateLimitPassed = checkClientRateLimit('signup', 3);
      if (!rateLimitPassed) {
        toast({
          title: "Too many attempts",
          description: "Please wait before trying again.",
          variant: "destructive"
        });
        return;
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        toast({
          title: "Invalid phone number",
          description: "Please enter a valid 10-digit US phone number",
          variant: "destructive"
        });
        return;
      }

      if (!smsConsent) {
        toast({
          title: "SMS consent required",
          description: "You must agree to receive SMS messages to use SMS Journal",
          variant: "destructive"
        });
        return;
      }

      console.log('Attempting signup with:', { email: sanitizedEmail, phone: formattedPhone });

      // Call secure-auth function directly for token-based flow
      const response = await supabase.functions.invoke('secure-auth', {
        body: {
          action: 'signup',
          email: sanitizedEmail,
          password,
          phoneNumber: formattedPhone,
          timezone: userTimezone
        }
      });
      
      if (response.error) {
        console.error('Signup error:', response.error);
        
        // Log failed signup attempt
        logSecurityEvent({
          event_type: 'signup_failure',
          identifier: sanitizedEmail,
          details: { error: response.error.message, phone: formattedPhone },
          severity: 'medium'
        });
        
        if (response.error.message?.includes('rate limit') || response.error.message?.includes('Rate limit')) {
          toast({
            title: "Too many attempts",
            description: "Please wait before trying again.",
            variant: "destructive"
          });
        } else if (response.error.message?.includes('User already registered')) {
          toast({
            title: "Account exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sign up failed",
            description: response.error.message || 'Failed to create account. Please try again.',
            variant: "destructive"
          });
        }
        return;
      }

      const { verification_token, redirect_to } = response.data;
      if (!verification_token) {
        toast({
          title: "Error",
          description: "Failed to generate verification token. Please try again.",
          variant: "destructive"
        });
        return;
      }

      console.log('Signup successful, token generated');
      
      // Send SMS confirmation
      await sendSignupConfirmation(formattedPhone);

      // Keep token in memory only - do NOT persist to sessionStorage
      setVerificationToken(verification_token);
      
      // Immediately clear password from state
      setPassword('');

      // Log successful signup
      logSecurityEvent({
        event_type: 'signup_success',
        identifier: sanitizedEmail,
        details: { phone: formattedPhone },
        severity: 'low'
      });

      toast({
        title: "Account created!",
        description: "Check your phone for verification instructions."
      });
      
      // Navigate to phone verification with token in memory
      onSignUpSuccess(formattedPhone, verification_token, redirect_to);
      
    } catch (error) {
      console.error('Signup error:', error);
      logSecurityEvent({
        event_type: 'signup_error',
        identifier: email,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'high'
      });
      toast({
        title: "An unexpected error occurred",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <input type="hidden" name="_csrf" value={csrfToken} />
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
            I authorize Journal By Text to send journaling reminders and prompts to the provided phone number using automated means. Message/data rates apply. Message frequency varies. Text HELP for help or STOP to opt out. Consent is not a condition of purchase. See{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline">
              privacy policy
            </Link>
            .
          </Label>
        </div>
      </div>
      <div>
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input 
            id="signup-password" 
            type={showPassword ? "text" : "password"}
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            minLength={8}
            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
            title="Password must be at least 8 characters long and contain uppercase, lowercase, and at least one number"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600" />
            ) : (
              <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Minimum 8 characters with uppercase, lowercase, and at least one number
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account...' : 'Sign Up'}
      </Button>
    </form>
  );
};
