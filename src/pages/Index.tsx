
import { useAuth } from "@/hooks/useAuth";
import { JournalDashboard } from "@/components/JournalDashboard";
import { AuthComponent } from "@/components/AuthComponent";
import { useLocation } from "react-router-dom";

const Index = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  // If user is authenticated and on /auth route, show dashboard
  // If user is authenticated and on /app route, show dashboard
  // If user is not authenticated, show auth component
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {user ? <JournalDashboard /> : <AuthComponent />}
    </div>
  );
};

export default Index;
