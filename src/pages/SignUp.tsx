
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { MessageSquare } from 'lucide-react';

const SignUp = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/journal');
    }
  }, [user, loading, navigate]);

  const handleSignUpSuccess = (phoneNumber: string) => {
    // Handle successful sign up - could show verification screen or redirect
    console.log('Sign up successful for phone:', phoneNumber);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-800">Journal By Text</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Create your account</h1>
              <p className="text-slate-600">Start journaling via text today</p>
            </div>

            <SignUpForm 
              loading={formLoading} 
              setLoading={setFormLoading}
              onSignUpSuccess={handleSignUpSuccess}
            />

            <div className="mt-6 text-center">
              <p className="text-slate-600">
                Already have an account?{' '}
                <Link to="/sign-in" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
