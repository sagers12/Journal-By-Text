
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = () => {
    console.log('Clearing auth state');
    setSession(null);
    setUser(null);
    // Clear any stale session data from localStorage
    localStorage.removeItem('supabase.auth.token');
  };

  const validateSession = async (session: Session | null) => {
    if (!session) return null;

    try {
      // Test if the session is still valid by making a simple auth call
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.log('Session validation failed:', error?.message || 'No user returned');
        clearAuthState();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Session validation error:', error);
      clearAuthState();
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session ? 'session exists' : 'no session');
        
        if (event === 'SIGNED_OUT' || !session) {
          clearAuthState();
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          const validSession = await validateSession(session);
          if (validSession) {
            setSession(validSession);
            setUser(validSession.user);
          }
          setLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session ? 'session exists' : 'no session');
      
      if (session) {
        const validSession = await validateSession(session);
        if (validSession) {
          setSession(validSession);
          setUser(validSession.user);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, phoneNumber?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: phoneNumber ? { phone_number: phoneNumber } : {}
      }
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  };

  const signOut = async () => {
    console.log('Attempting sign out, current session:', session ? 'exists' : 'missing');
    
    try {
      // Always clear local state first
      clearAuthState();
      
      // Then attempt server-side sign out
      const { error } = await supabase.auth.signOut();
      
      // Even if server sign out fails, we've cleared local state
      if (error) {
        console.log('Server sign out failed, but local state cleared:', error.message);
      }
      
      return { error: null }; // Return success since local state is cleared
    } catch (error) {
      console.error('Sign out error:', error);
      // Local state is already cleared, so this is not critical
      return { error: null };
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user && !!session
  };
};
