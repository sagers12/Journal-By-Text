
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SignInForm } from '@/components/auth/SignInForm';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useSEO } from '@/hooks/useSEO';

const SignIn = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [formLoading, setFormLoading] = useState(false);

  useSEO({
    title: "Sign In - Journal By Text",
    description: "Sign in to your Journal By Text account to access your SMS journal entries.",
    noIndex: true
  });

  useEffect(() => {
    if (!loading && user) {
      navigate('/journal');
    }
  }, [user, loading, navigate]);

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
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome back</h1>
              <p className="text-slate-600">Sign in to your account</p>
            </div>

            <SignInForm loading={formLoading} setLoading={setFormLoading} />

            <div className="mt-6 text-center">
              <p className="text-slate-600">
                Don't have an account?{' '}
                <Link to="/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
