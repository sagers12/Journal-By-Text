
import { JournalDashboard } from '@/components/JournalDashboard';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';

const Journal = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-6">
        <SubscriptionBanner />
      </div>
      <JournalDashboard />
    </div>
  );
};

export default Journal;
