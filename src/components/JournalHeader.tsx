
import { MessageSquare, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const JournalHeader = () => {
  const { signOut, user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      console.log('Sign out attempt:', { hasUser: !!user, hasSession: !!session });
      
      if (!session) {
        console.log('No session found, redirecting to home');
        navigate('/');
        return;
      }

      const { error } = await signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
      console.log('Sign out successful');
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      });
      navigate('/');
    } catch (error: any) {
      console.error('Sign out failed:', error);
      toast({
        title: "Sign out failed",
        description: error.message || "Unable to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Text-2-Journal</h1>
          <p className="text-slate-600">Your personal journaling space</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    </div>
  );
};
