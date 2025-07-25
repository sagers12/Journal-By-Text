
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="relative z-50 bg-white/70 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">Journal By Text</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/auth?tab=signin">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-800">
                Log in
              </Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Start Now
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Privacy Policy Content */}
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-6">PRIVACY POLICY</h1>
          
          <p className="text-slate-600 mb-8">
            <strong>Effective Date:</strong> June 23, 2025
          </p>

          <div className="prose prose-slate max-w-none">
            <p className="text-slate-700 mb-6 leading-relaxed">
              We value your privacy and make every effort to respect your wishes and personal information. Please read this policy carefully to understand how we collect, use, and manage your phone numbers.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4 mt-8">COLLECTION OF PHONE NUMBERS</h2>
            <p className="text-slate-700 mb-6 leading-relaxed">
              We collect your phone numbers only when you voluntarily provide them to us, for example, during transactions, inquiries, or when you sign up for our promotional messages. You can opt in to receive these SMS messages by providing your phone number during our onboarding process.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4 mt-8">USE OF PHONE NUMBERS FOR SMS</h2>
            <p className="text-slate-700 mb-6 leading-relaxed">
              Your phone numbers are primarily used to provide you with notifications when training is due, and can be used to reply if you have questions about specific training materials. SMS messaging charges may be applied by your carrier. We will only share your phone number with our SMS provider, subject to their privacy policy.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4 mt-8">OPTING OUT OF MARKETING MESSAGES</h2>
            <p className="text-slate-700 mb-6 leading-relaxed">
              If at any time you wish to stop receiving messages from us, you can opt out by texting STOP.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4 mt-8">PRIVACY OF PHONE NUMBERS</h2>
            <p className="text-slate-700 mb-6 leading-relaxed">
              Once you have opted out, we will not send you any more SMS messages, nor will we sell or transfer your phone number to another party.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mb-4 mt-8">CHANGES TO THIS POLICY</h2>
            <p className="text-slate-700 mb-6 leading-relaxed">
              We may periodically update this policy. We will notify you about significant changes in the way we treat your information by placing a prominent notice on our site.
            </p>

            <p className="text-slate-700 mb-6 leading-relaxed">
              We thank you for your understanding and cooperation. If you have any questions or concerns about this policy, please feel free to contact us via the form on our site.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200">
            <Link to="/">
              <Button variant="outline" className="text-slate-600 hover:text-slate-800">
                ← Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-800 text-white mt-16">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold">Journal By Text</span>
          </div>
          <p className="text-slate-400 mb-4">
            Your thoughts, one text away.
          </p>
          <div className="flex justify-center gap-6 text-sm text-slate-400">
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/support" className="hover:text-white">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
