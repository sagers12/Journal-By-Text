
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PhoneVerification } from '@/components/PhoneVerification';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

export const AuthComponent = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'signin';
  
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const { toast } = useToast();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'signin' || tab === 'signup')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleSignUpSuccess = (phoneNumber: string) => {
    setIsNewUser(true);
    setShowPhoneVerification(true);
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
          <AuthTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            loading={loading}
            setLoading={setLoading}
            onSignUpSuccess={handleSignUpSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
};
