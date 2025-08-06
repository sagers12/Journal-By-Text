import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handlePasswordReset = async () => {
      console.log('ResetPassword component mounted');
      console.log('Current URL:', window.location.href);
      console.log('Search params:', Object.fromEntries(searchParams.entries()));

      try {
        // Check for explicit errors first
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.log('URL contains error:', error, errorDescription);
          toast({
            title: "Reset link invalid",
            description: errorDescription === 'Email+link+is+invalid+or+has+expired' 
              ? "This password reset link has expired or is invalid. Please request a new one."
              : "There was an issue with your reset link. Please request a new one.",
            variant: "destructive"
          });
          setTimeout(() => navigate('/sign-in'), 3000);
          return;
        }

        // Look for recovery tokens in URL
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const tokenType = searchParams.get('type');
        
        console.log('Token info:', { accessToken: !!accessToken, refreshToken: !!refreshToken, tokenType });

        if (accessToken && refreshToken && tokenType === 'recovery') {
          console.log('Found recovery tokens, verifying...');
          
          // Verify the recovery token
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: accessToken,
            type: 'recovery'
          });

          console.log('Verify OTP result:', { data: !!data, error: verifyError });

          if (verifyError) {
            console.error('Token verification failed:', verifyError);
            toast({
              title: "Reset link invalid",
              description: "This password reset link has expired or is invalid. Please request a new one.",
              variant: "destructive"
            });
            setTimeout(() => navigate('/sign-in'), 3000);
            return;
          }

          if (data.session) {
            console.log('Session established from recovery token');
            setSession(data.session);
            setIsAuthenticated(true);
          }
        } else {
          // Check for existing session (fallback)
          console.log('No recovery tokens found, checking existing session...');
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession) {
            console.log('Found existing session');
            setSession(currentSession);
            setIsAuthenticated(true);
          } else {
            console.log('No session found, invalid reset link');
            toast({
              title: "Reset link invalid",
              description: "This password reset link has expired or is invalid. Please request a new one.",
              variant: "destructive"
            });
            setTimeout(() => navigate('/sign-in'), 3000);
          }
        }
      } catch (error: any) {
        console.error('Password reset handling error:', error);
        toast({
          title: "Error",
          description: "Unable to verify reset link. Please try again.",
          variant: "destructive"
        });
        setTimeout(() => navigate('/sign-in'), 3000);
      } finally {
        setCheckingAuth(false);
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, !!session);
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event detected');
        setSession(session);
        setIsAuthenticated(!!session);
        setCheckingAuth(false);
      }
    });

    handlePasswordReset();

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams, toast, navigate]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!password || !confirmPassword) {
        throw new Error('Please fill in all fields');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been successfully updated. You can now sign in with your new password."
      });

      // Redirect to sign in page
      navigate('/sign-in');
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Verifying Reset Link</CardTitle>
            <CardDescription>
              Please wait while we verify your password reset link...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If not authenticated, show error state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-600">Reset Link Invalid</CardTitle>
            <CardDescription>
              This password reset link has expired or is invalid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-slate-600">
              You'll be redirected to request a new password reset link in a few seconds.
            </p>
            <Button 
              onClick={() => navigate('/sign-in')} 
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};