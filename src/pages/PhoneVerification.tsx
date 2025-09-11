import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MessageSquare, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSEO } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { useVerificationState } from '@/hooks/useVerificationState';
import { useVerificationNavigation } from '@/hooks/useVerificationNavigation';

export const PhoneVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get state from navigation
  const phoneNumber = location.state?.phoneNumber;
  const verificationToken = location.state?.verificationToken;
  const redirectTo = location.state?.redirectTo;
  
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showSupport, setShowSupport] = useState(false);

  // Use verification state hook
  const {
    state: verificationState,
    error: verificationError,
    authLink,
    attemptCount,
    isVerifying,
    isSuccess,
    isError,
    isTimeout,
    retry,
  } = useVerificationState({
    verificationToken,
    userId: user?.id,
    onVerificationSuccess: (authLink) => {
      console.log('Verification success callback triggered');
    },
    onTimeout: () => {
      toast({
        title: "Verification timeout",
        description: "Please try signing up again.",
        variant: "destructive"
      });
    },
  });

  // Use navigation hook
  const { hasNavigated } = useVerificationNavigation({
    phoneNumber,
    verificationToken,
    authLink,
    isSuccess,
    isTimeout,
  });

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

  const handleRetry = () => {
    retry();
    toast({
      title: "Retrying verification",
      description: "Checking for verification again...",
    });
  };

  // Show loading state during navigation
  if (hasNavigated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-600">
            {isSuccess ? 'Signing you in...' : 'Redirecting...'}
          </div>
        </div>
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

              {/* Verification Status */}
              <div className="flex items-center justify-center gap-2 text-slate-500">
                {isSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">Phone verified! Signing you in...</span>
                  </>
                ) : isError ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600">
                      {verificationError || 'Verification failed'}
                    </span>
                  </>
                ) : isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Checking verification... (attempt {attemptCount})</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      Waiting for verification • {formatTimeElapsed(timeElapsed)}
                    </span>
                  </>
                )}
              </div>

              {/* Error Recovery */}
              {isError && (
                <div className="bg-red-50/50 rounded-lg p-4 border border-red-200/50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-800 mb-1">Verification Error</h4>
                      <p className="text-sm text-red-700 mb-3">
                        {verificationError || 'Something went wrong with verification.'}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRetry}
                        className="bg-white/50 hover:bg-white/70"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeout Warning */}
              {isTimeout && (
                <div className="bg-orange-50/50 rounded-lg p-4 border border-orange-200/50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-orange-800 mb-1">Verification Timeout</h4>
                      <p className="text-sm text-orange-700 mb-3">
                        The verification process has timed out. You'll need to sign up again.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate('/sign-up')}
                        className="bg-white/50 hover:bg-white/70"
                      >
                        Back to Sign Up
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Help Section for Delays */}
              {timeElapsed > 30 && !isError && !isTimeout && !isSuccess && (
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
                      <div className="flex gap-2">
                        {showSupport && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleResendInstructions}
                            className="bg-white/50 hover:bg-white/70"
                          >
                            Need help?
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleRetry}
                          className="bg-white/50 hover:bg-white/70"
                          disabled={isVerifying}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Check Again
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center">
                <p className="text-xs text-slate-500 mb-3">
                  {isSuccess 
                    ? "Verification successful! Redirecting..." 
                    : "This page will automatically update when you verify your phone number"
                  }
                </p>
                {!isSuccess && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/sign-up')}
                    className="text-slate-600 hover:text-slate-800"
                  >
                    ← Back to sign up
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PhoneVerification;