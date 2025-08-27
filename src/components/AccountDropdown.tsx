import { useState } from "react";
import { ChevronDown, Settings, Download, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AccountDropdownProps {
  onExportClick: () => void;
}

export const AccountDropdown = ({ onExportClick }: AccountDropdownProps) => {
  const { signOut, user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      console.log('Sign out attempt:', { hasUser: !!user, hasSession: !!session });
      
      const { error } = await signOut();
      
      console.log('Sign out completed');
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      });
      navigate('/');
    } catch (error: any) {
      console.error('Sign out failed:', error);
      // Even if there's an error, try to navigate away since local state should be cleared
      toast({
        title: "Signed out",
        description: "You have been signed out."
      });
      navigate('/');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
        >
          Account
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-lg">
        <DropdownMenuItem 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 cursor-pointer hover:bg-slate-50"
        >
          <Settings className="w-4 h-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onExportClick}
          className="flex items-center gap-2 cursor-pointer hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          Export
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="flex items-center gap-2 cursor-pointer hover:bg-slate-50"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};