
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { JournalDashboard } from "@/components/JournalDashboard";
import { AuthForm } from "@/components/AuthForm";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authData = localStorage.getItem("journal-auth");
    if (authData) {
      const { phoneNumber, isVerified } = JSON.parse(authData);
      if (phoneNumber && isVerified) {
        setIsAuthenticated(true);
      }
    }
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {isAuthenticated ? (
        <JournalDashboard />
      ) : (
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
};

export default Index;
