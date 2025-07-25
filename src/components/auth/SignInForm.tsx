
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCSRFToken } from '@/components/CSRFToken';
import { sanitizeInput, detectSuspiciousActivity, logSecurityEvent, checkClientRateLimit } from '@/utils/securityMonitoring';

interface SignInFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const SignInForm = ({ loading, setLoading }: SignInFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { signIn } = useAuth();
  const { toast } = useToast();
  const { csrfToken, validateAndRefreshToken } = useCSRFToken();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // CSRF protection
      const validToken = validateAndRefreshToken();
      if (!validToken) {
        throw new Error('Security token validation failed. Please refresh the page.');
      }

      // Client-side rate limiting
      if (!checkClientRateLimit('signin', 5)) {
        throw new Error('Too many sign-in attempts. Please wait before trying again.');
      }

      // Input validation and sanitization
      if (!email) {
        throw new Error('Email is required for sign in');
      }

      const sanitizedEmail = sanitizeInput(email, 254);

      // Check for suspicious activity
      if (detectSuspiciousActivity(email)) {
        await logSecurityEvent({
          event_type: 'suspicious_signin_attempt',
          identifier: email,
          details: {
            suspicious_email: email,
            user_agent: navigator.userAgent
          },
          severity: 'high'
        });
        throw new Error('Invalid input detected. Please check your email address.');
      }

      const { error } = await signIn(sanitizedEmail, password);
      if (error) throw error;
      
      toast({
        title: "Welcome back!",
        description: "Redirecting to your journal..."
      });
      // Navigation will be handled by the Auth page component
    } catch (error: any) {
      // Log failed signin attempt
      await logSecurityEvent({
        event_type: 'failed_signin',
        identifier: email || 'unknown',
        details: {
          error: error.message,
          user_agent: navigator.userAgent
        },
        severity: 'medium'
      });

      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <input type="hidden" name="_csrf" value={csrfToken} />
      <div>
        <Label htmlFor="signin-email">Email</Label>
        <Input 
          id="signin-email" 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="your@email.com" 
          required 
        />
      </div>
      <div>
        <Label htmlFor="signin-password">Password</Label>
        <Input 
          id="signin-password" 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
};
