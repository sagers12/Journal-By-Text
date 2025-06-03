
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Phone, Shield } from "lucide-react";

interface AuthFormProps {
  onAuthSuccess: () => void;
}

export const AuthForm = ({ onAuthSuccess }: AuthFormProps) => {
  const [step, setStep] = useState<'phone' | 'verify' | 'password'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate phone verification
    setTimeout(() => {
      setIsLoading(false);
      setStep('verify');
    }, 1000);
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate verification check
    setTimeout(() => {
      setIsLoading(false);
      setStep('password');
    }, 1000);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate account creation/login
    setTimeout(() => {
      localStorage.setItem("journal-auth", JSON.stringify({
        phoneNumber,
        isVerified: true,
        password // In real app, this would be hashed
      }));
      setIsLoading(false);
      onAuthSuccess();
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">SMS Journal</h1>
          <p className="text-slate-600">Journal anywhere, anytime - just send a text</p>
        </div>

        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {step === 'phone' && <Phone className="w-5 h-5" />}
              {step === 'verify' && <Shield className="w-5 h-5" />}
              {step === 'password' && <Shield className="w-5 h-5" />}
              {step === 'phone' && 'Enter Your Phone Number'}
              {step === 'verify' && 'Verify Your Number'}
              {step === 'password' && 'Set Your Password'}
            </CardTitle>
            <CardDescription>
              {step === 'phone' && 'We\'ll use this to send your journal entries'}
              {step === 'verify' && 'Enter the verification code we sent to your phone'}
              {step === 'password' && 'Create a secure password for your account'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    required
                    className="mt-1"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </form>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerificationSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    required
                    className="mt-1 text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('phone')}
                >
                  Change Phone Number
                </Button>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    required
                    className="mt-1"
                    minLength={8}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Complete Setup'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
