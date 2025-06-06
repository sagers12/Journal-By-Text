
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PhoneVerification } from '@/components/PhoneVerification';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

export const AuthComponent = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'signin';
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'signin' || tab === 'signup')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
      
      setIsNewUser(true);
      setShowPhoneVerification(true);
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!email) {
        throw new Error('Email is required for sign in');
      }
      const { error } = await signIn(email, password);
      if (error) throw error;
      
      toast({
        title: "Welcome back!",
        description: "Redirecting to your journal..."
      });
      // Navigation will be handled by the Auth page component
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerificationComplete = () => {
    setShowPhoneVerification(false);
    toast({
      title: "Setup complete!",
      description: "You can now send journal entries via SMS."
    });
  };

  const handleSkipPhoneVerification = () => {
    setShowPhoneVerification(false);
    toast({
      title: "Welcome!",
      description: "You can verify your phone number later in settings."
    });
  };

  if (showPhoneVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <PhoneVerification 
          onVerificationComplete={handlePhoneVerificationComplete}
          onSkip={isNewUser ? handleSkipPhoneVerification : undefined}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">SMS Journal</CardTitle>
          <CardDescription>
            Journal anywhere, anytime - just send a text
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
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
            </TabsContent>
            
            <TabsContent value="signup">
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
