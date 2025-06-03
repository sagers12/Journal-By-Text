
import { useAuth } from "@/hooks/useAuth";
import { JournalDashboard } from "@/components/JournalDashboard";
import { AuthComponent } from "@/components/AuthComponent";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {user ? <JournalDashboard /> : <AuthComponent />}
    </div>
  );
};

export default Index;
