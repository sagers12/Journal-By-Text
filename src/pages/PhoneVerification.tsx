import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Phone, ArrowLeft, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';

export const PhoneVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Get state from navigation - now includes verification token
  const phoneNumber = location.state?.phoneNumber;
  const verificationToken = location.state?.verificationToken;
  const redirectTo = location.state?.redirectTo;
  
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  useSEO({
    title: "Verify Your Phone - Journal By Text",
    description: "Complete your sign-up by verifying your phone number.",
    noIndex: true
  });

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    // Show support option after 2 minutes
    if (timeElapsed >= 120) {
      setShowSupport(true);
    }

    return () => clearInterval(timer);
  }, [timeElapsed]);

  // Verification function using token-based approach
  const attemptVerification = async () => {
    if (!verificationToken || verifying) return;

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-and-signin', {
        body: { verification_token: verificationToken }
      });

      if (error) {
        console.error('Verification failed:', error);
        return;
      }

      if (data?.success && data?.auth_link) {
        console.log('Verification successful, redirecting to auth link');
        setIsVerified(true);
        toast({
          title: "Phone verified!",
          description: "Signing you in..."
        });
        
        // Use the magic link to complete authentication
        window.location.href = data.auth_link;
      }
    } catch (error) {
      console.error('Error during verification:', error);
    } finally {
      setVerifying(false);
    }
  };

  // Check verification status periodically (every 5 seconds)
  useEffect(() => {
    if (isVerified || !verificationToken) return;

    // Try verification immediately
    attemptVerification();

    // Then check every 5 seconds
    const interval = setInterval(attemptVerification, 5000);

    return () => clearInterval(interval);
  }, [verificationToken, isVerified]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/journal');
    }
  }, [user, authLoading, navigate]);

  // Redirect if missing required data
  useEffect(() => {
    if (!phoneNumber || !verificationToken) {
      console.log('Missing phone number or verification token, redirecting to signup');
      navigate('/sign-up');
    }
  }, [phoneNumber, verificationToken, navigate]);

  const formatTimeElapsed = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const maskPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      const last4 = cleanPhone.slice(-4);
      return `+1 (***) ***-${last4}`;
    }
    return phone;
  };

  const handleResendInstructions = () => {
    toast({
      title: "Instructions sent",
      description: "If you didn't receive the text, check your spam folder or contact support.",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <Card className="bg-white/70 backdrop-blur-sm shadow-lg border border-white/50">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-800">Journal By Text</span>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">Check your phone!</CardTitle>
              <CardDescription className="text-slate-600">
                We've sent a text to {phoneNumber ? maskPhoneNumber(phoneNumber) : 'your phone'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-200/50">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">What to expect:</h3>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• You'll receive a text message shortly</li>
                      <li>• Simply reply <strong>YES</strong> to verify your phone</li>
                      <li>• You'll be automatically signed in</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-slate-500">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {verifying ? 'Checking verification...' : `Waiting for verification • ${formatTimeElapsed(timeElapsed)}`}
                </span>
              </div>

              {timeElapsed > 30 && (
                <div className="bg-yellow-50/50 rounded-lg p-4 border border-yellow-200/50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800 mb-1">Taking longer than expected?</h4>
                      <p className="text-sm text-yellow-700 mb-3">
                        Text messages usually arrive within 30 seconds. If you haven't received it:
                      </p>
                      <ul className="text-sm text-yellow-700 space-y-1 mb-3">
                        <li>• Check for messages from unknown numbers</li>
                        <li>• Make sure you have cellular service</li>
                        <li>• Wait a bit longer - sometimes there are delays</li>
                      </ul>
                      {showSupport && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleResendInstructions}
                          className="bg-white/50"
                        >
                          Need help?
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center">
                <p className="text-xs text-slate-500 mb-3">
                  This page will automatically refresh when you verify your phone number
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/sign-up')}
                  className="text-slate-600 hover:text-slate-800"
                >
                  ← Back to sign up
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PhoneVerification;