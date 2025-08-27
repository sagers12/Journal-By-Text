
import { MessageSquare } from "lucide-react";
import { AccountDropdown } from "@/components/AccountDropdown";

interface JournalHeaderProps {
  onExportClick: () => void;
}

export const JournalHeader = ({ onExportClick }: JournalHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Journal By Text</h1>
          <p className="text-slate-600">Your personal journaling space</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AccountDropdown onExportClick={onExportClick} />
      </div>
    </div>
  );
};
