
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Shield, CheckCircle } from 'lucide-react';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';

interface PhoneVerificationProps {
  onVerificationComplete: () => void;
  onSkip?: () => void;
}

export const PhoneVerification = ({ onVerificationComplete, onSkip }: PhoneVerificationProps) => {
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  const {
    sendVerificationCode,
    verifyCode,
    isLoading,
    verificationSent,
    setVerificationSent
  } = usePhoneVerification();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
    
    const result = await sendVerificationCode(formattedPhone);
    if (result.success) {
      setStep('verify');
      setVerificationSent(true);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
    
    const result = await verifyCode(formattedPhone, verificationCode);
    if (result.success) {
      onVerificationComplete();
    }
  };

  const twilioNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER || '+1234567890';

  return (
    <div className="max-w-md mx-auto">
      <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {step === 'phone' && <Phone className="w-5 h-5" />}
            {step === 'verify' && <Shield className="w-5 h-5" />}
            {step === 'phone' && 'Verify Your Phone Number'}
            {step === 'verify' && 'Enter Verification Code'}
          </CardTitle>
          <CardDescription>
            {step === 'phone' && 'We need to verify your phone number so you can send journal entries via SMS'}
            {step === 'verify' && `Enter the 6-digit code we sent to ${phoneNumber}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' && (
            <form onSubmit={handleSendCode} className="space-y-4">
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
                <p className="text-xs text-slate-500 mt-1">
                  This is the number you'll use to send journal entries
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isLoading}
              >
                {isLoading ? 'Sending Code...' : 'Send Verification Code'}
              </Button>
              {onSkip && (
                <Button 
                  type="button" 
                  variant="ghost"
                  className="w-full"
                  onClick={onSkip}
                >
                  Skip for now
                </Button>
              )}
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
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
                {isLoading ? 'Verifying...' : 'Verify Phone Number'}
              </Button>
              <Button 
                type="button" 
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('phone');
                  setVerificationSent(false);
                  setVerificationCode('');
                }}
              >
                Change Phone Number
              </Button>
            </form>
          )}

          {verificationSent && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Ready to journal via SMS!</p>
                  <p className="text-blue-700 mt-1">
                    Once verified, text your journal entries to: <strong>{twilioNumber}</strong>
                  </p>
                  <p className="text-blue-600 mt-2 text-xs">
                    You can send text messages and photos. Multiple messages on the same day will be grouped together.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
