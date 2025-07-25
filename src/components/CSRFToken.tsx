import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// CSRF Protection Component
export const useCSRFToken = () => {
  const [csrfToken, setCSRFToken] = useState<string>('');

  useEffect(() => {
    // Generate a CSRF token for the session
    const generateCSRFToken = () => {
      const token = crypto.randomUUID();
      sessionStorage.setItem('csrf-token', token);
      setCSRFToken(token);
      return token;
    };

    // Get existing token or generate new one
    const existingToken = sessionStorage.getItem('csrf-token');
    if (existingToken) {
      setCSRFToken(existingToken);
    } else {
      generateCSRFToken();
    }
  }, []);

  const validateAndRefreshToken = () => {
    const storedToken = sessionStorage.getItem('csrf-token');
    if (storedToken === csrfToken && csrfToken) {
      // Token is valid, generate a new one for next request
      const newToken = crypto.randomUUID();
      sessionStorage.setItem('csrf-token', newToken);
      setCSRFToken(newToken);
      return storedToken;
    }
    return null;
  };

  return {
    csrfToken,
    validateAndRefreshToken
  };
};

// HOC to add CSRF protection to forms
export const withCSRFProtection = <T extends object>(
  WrappedComponent: React.ComponentType<T>
) => {
  return (props: T) => {
    const { csrfToken } = useCSRFToken();
    
    return (
      <>
        <input type="hidden" name="_csrf" value={csrfToken} />
        <WrappedComponent {...props} />
      </>
    );
  };
};