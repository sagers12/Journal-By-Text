
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
      const { error } = await signUp(email, password, phoneNumber);
      if (error) throw error;
      
      onSignUpSuccess(phoneNumber);
      toast({
        title: "Account created!",
        description: "Please verify your phone number to start journaling via SMS."
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
          onChange={e => setPhoneNumber(e.target.value)} 
          placeholder="+1 (555) 123-4567" 
          required
        />
        <p className="text-xs text-slate-500 mt-1">
          Required for sending journal entries via SMS
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
            I agree to receive SMS messages from SMS Journal.
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
