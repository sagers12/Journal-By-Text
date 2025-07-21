import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Smartphone, Search, Download, Clock, Shield, Zap, Heart } from "lucide-react";
import { Link } from "react-router-dom";
const Marketing = () => {
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="relative z-50 bg-white/70 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">Journal By Text</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/sign-in">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-800">
                Log in
              </Button>
            </Link>
            <Link to="/sign-up">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Start Now
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex">
        {/* Left Column - White Background */}
        <div className="flex-1 bg-white flex items-center">
          <div className="container mx-auto px-8 py-20 max-w-2xl">
            <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-100">
              ✨ Journal anywhere, anytime
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-800 mb-6 leading-tight">The easiest way to keep a journal</h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">You are here because you've always wanted to keep a journal, but you've never done it successfully. You can't find a way to be consistent. Well, those days are gone. This is as easy as it will ever be. Just send a text. No apps, no logins, no friction. Daily reminders. Daily prompts. You've got this!</p>
            <div className="flex justify-start">
              <Link to="/sign-up">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-3">
                  Start now—it's free
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Right Column - Branded Background with iPhone */}
        <div className="flex-1 bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center p-8">
          <div className="max-w-md">
            <img 
              src="/lovable-uploads/173c04a2-c3d6-408a-b7a3-97b25ea1b56c.png" 
              alt="iPhone showing text conversation for journaling" 
              className="w-full h-auto drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Why Journal Section */}
      <section className="py-20 px-4 bg-white/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Why Journal?</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Journaling isn't just writing—it's a pathway to better mental health, clearer thinking, and personal growth.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <Heart className="w-8 h-8 text-red-500 mb-2" />
                <CardTitle>Mental Clarity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Reduce stress and anxiety by processing your thoughts. Studies show journaling improves emotional regulation and mental well-being.
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <Zap className="w-8 h-8 text-yellow-500 mb-2" />
                <CardTitle>Better Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Gain perspective on your life patterns. Regular reflection helps you make more thoughtful choices and learn from experiences.
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <Clock className="w-8 h-8 text-blue-500 mb-2" />
                <CardTitle>Track Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Look back and see how far you've come. Your journal becomes a personal timeline of growth, achievements, and memories.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Journaling, Reimagined</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              We've removed every barrier between you and your thoughts. Here's how we make journaling effortless.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm text-center">
              <CardHeader>
                <Smartphone className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Text to Journal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Send a text message to your personal journal number. That's it. Your entry is automatically saved and organized.
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm text-center">
              <CardHeader>
                <Search className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Smart Search</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Find any memory instantly. Search by keyword, date, or phrase across your entire journal history.
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm text-center">
              <CardHeader>
                <Download className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>Export & Backup</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Your memories are yours forever. Export your journal to PDF or text format anytime.
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm text-center">
              <CardHeader>
                <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <CardTitle>Private & Secure</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">Your thoughts are kept safe, private, and encrypted. Your journal is secure and always will be.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Simple as 1-2-3</h2>
            <p className="text-xl text-slate-600">
              Start journaling in under 60 seconds
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Sign Up</h3>
              <p className="text-slate-600">
                Create your account and verify your phone number. Takes less than a minute.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Start Texting</h3>
              <p className="text-slate-600">
                Send your first journal entry via text. Include photos, thoughts, or daily highlights.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Watch It Grow</h3>
              <p className="text-slate-600">
                View, search, and reflect on your journal through our beautiful web interface.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-slate-600">
              Start free, upgrade when you're ready for more
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="border-2 border-slate-200 bg-white/70 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Free</CardTitle>
                <CardDescription className="text-lg">Perfect for those who'll likely give up five days into this...</CardDescription>
                <div className="text-4xl font-bold text-slate-800 mt-4">$0</div>
                <div className="text-slate-600">forever</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    1 SMS entry per day
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    15 photos total
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Basic search
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    30-day export history
                  </li>
                </ul>
                <Link to="/sign-up" className="block">
                  <Button className="w-full mt-6" variant="outline">
                    Start Free
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 relative">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white">
                Most Popular
              </Badge>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Committed</CardTitle>
                <CardDescription className="text-lg">Perfect for those who are committed to changing their habits...</CardDescription>
                <div className="text-4xl font-bold text-slate-800 mt-4">$4.99</div>
                <div className="text-slate-600">per month</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Unlimited SMS entries
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Unlimited photos
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Advanced search
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Full export history
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    SMS reminders
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Priority support
                  </li>
                </ul>
                <Link to="/sign-up" className="block">
                  <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    Start Pro Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Your Journal?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of people who have transformed their journaling practice with Journal By Text. 
            Your future self will thank you.
          </p>
          <Link to="/sign-up">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-3">
              Start Journaling Now - It's Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-800 text-white">
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
    </div>;
};
export default Marketing;