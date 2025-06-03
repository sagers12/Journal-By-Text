
import { MessageSquare, Calendar, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export const JournalHeader = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile(user?.id);
  
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const handleLogout = async () => {
    await signOut();
  };

  const displayInfo = profile?.phone_number || user?.email || "User";

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">My Journal</h1>
            <div className="flex items-center text-slate-600 text-sm">
              <User className="w-4 h-4 mr-1" />
              <span>{displayInfo}</span>
            </div>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          className="text-slate-600 hover:text-slate-800"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
      
      <div className="flex items-center justify-center text-slate-600 bg-white/40 backdrop-blur-sm rounded-lg py-3 px-4 border border-slate-200">
        <Calendar className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">{today}</span>
      </div>
    </div>
  );
};
