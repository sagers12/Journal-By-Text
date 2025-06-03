
import { MessageSquare, Calendar, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const JournalHeader = () => {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const handleLogout = () => {
    localStorage.removeItem("journal-auth");
    localStorage.removeItem("journal-entries");
    window.location.reload();
  };

  const authData = localStorage.getItem("journal-auth");
  const phoneNumber = authData ? JSON.parse(authData).phoneNumber : "";

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
              <span>{phoneNumber}</span>
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
