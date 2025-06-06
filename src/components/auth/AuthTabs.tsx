
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';

interface AuthTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onSignUpSuccess: (phoneNumber: string) => void;
}

export const AuthTabs = ({ 
  activeTab, 
  setActiveTab, 
  loading, 
  setLoading, 
  onSignUpSuccess 
}: AuthTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>
      
      <TabsContent value="signin">
        <SignInForm loading={loading} setLoading={setLoading} />
      </TabsContent>
      
      <TabsContent value="signup">
        <SignUpForm 
          loading={loading} 
          setLoading={setLoading} 
          onSignUpSuccess={onSignUpSuccess}
        />
      </TabsContent>
    </Tabs>
  );
};
