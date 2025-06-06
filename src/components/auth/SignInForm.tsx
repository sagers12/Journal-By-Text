
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SignInFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const SignInForm = ({ loading, setLoading }: SignInFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!email) {
        throw new Error('Email is required for sign in');
      }
      const { error } = await signIn(email, password);
      if (error) throw error;
      
      toast({
        title: "Welcome back!",
        description: "Redirecting to your journal..."
      });
      // Navigation will be handled by the Auth page component
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div>
        <Label htmlFor="signin-email">Email</Label>
        <Input 
          id="signin-email" 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="your@email.com" 
          required 
        />
      </div>
      <div>
        <Label htmlFor="signin-password">Password</Label>
        <Input 
          id="signin-password" 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
};
