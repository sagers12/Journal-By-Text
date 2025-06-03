
import { MessageCircle, Smartphone, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateEntry: () => void;
}

export const EmptyState = ({ onCreateEntry }: EmptyStateProps) => {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <MessageCircle className="w-12 h-12 text-white" />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-4">
        Welcome to Your Journal
      </h2>
      
      <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
        Start capturing your thoughts and experiences. You can create entries here on the web, 
        or simply send a text message to your dedicated number.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto mb-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200">
          <Smartphone className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 mb-2">SMS Journaling</h3>
          <p className="text-sm text-slate-600">
            Text your thoughts anytime to your personal journal number
          </p>
        </div>
        
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200">
          <PenTool className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 mb-2">Web Interface</h3>
          <p className="text-sm text-slate-600">
            Create and manage entries with rich editing capabilities
          </p>
        </div>
      </div>

      <Button 
        onClick={onCreateEntry}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-3"
      >
        <PenTool className="w-5 h-5 mr-2" />
        Create Your First Entry
      </Button>
    </div>
  );
};
