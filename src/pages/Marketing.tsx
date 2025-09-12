import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageSquare, Smartphone, Search, Download, Clock, Shield, Zap, Heart, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { useEffect } from "react";

const Marketing = () => {
  // SEO optimization for the marketing page
  useSEO({
    title: "Journal By Text - The Easiest Way to Keep a Journal via SMS",
    description: "Journal anywhere, anytime by simply sending a text message. No apps to download, no passwords to remember. Transform your journaling habit with Journal By Text - start your 10-day free trial today.",
    keywords: "journal, journaling, SMS journal, text message journal, digital journal, private journal, secure journaling, daily journal, journaling app alternative, text journaling, mobile journaling",
    canonicalUrl: "https://journalbytext.com/",
    ogImage: "https://journalbytext.com/lovable-uploads/cab78bea-5b0e-4707-8710-6caf5afe8188.png"
  });

  // Add structured data for better SEO
  useEffect(() => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Journal By Text",
      "alternateName": "SMS Journal",
      "description": "Journal anywhere, anytime by simply sending a text message. No apps to download, no passwords to remember.",
      "url": "https://journalbytext.com",
      "applicationCategory": "Lifestyle",
      "operatingSystem": "Web Browser, SMS",
      "offers": {
        "@type": "Offer",
        "price": "4.99",
        "priceCurrency": "USD",
        "billingIncrement": "Month",
        "category": "Subscription"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "150"
      },
      "creator": {
        "@type": "Organization",
        "name": "Journal By Text",
        "url": "https://journalbytext.com"
      },
      "featureList": [
        "SMS Journaling",
        "Secure & Private",
        "Smart Search",
        "Export & Backup",
        "Daily Reminders",
        "Photo Support"
      ]
    };

    let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script') as HTMLScriptElement;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);

    return () => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-white/20 shadow-md">
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
      <section className="py-12 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            {/* Left Column - Content */}
            <div className="space-y-6 md:space-y-8 text-center lg:text-left">
              <div className="bg-blue-100 text-blue-700 hover:bg-blue-100 w-fit mx-auto lg:mx-0 px-3 py-1 rounded-full text-sm font-medium">
                ✨ Journal anywhere, anytime
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-slate-800 leading-tight">
                The easiest way to keep <br />
                <span className="text-blue-600">a journal</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
                We've removed all the friction and all your excuses. It's as easy as texting your friend. Type words. Hit send. Done. You're journaling.
              </p>

              <div className="flex justify-center lg:justify-start">
                <Link to="/sign-up">
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-3">
                    Start journaling for free
                  </Button>
                </Link>
              </div>

              <div className="space-y-3 text-slate-600">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <p className="text-sm md:text-base">No credit card required to start</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <p className="text-sm md:text-base">No apps to download</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <p className="text-sm md:text-base">Daily prompts to inspire your writing</p>
                </div>
              </div>
            </div>
            
            {/* Right Column - Animated Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="hero-visual">
                <div className="phone-mockup">
                  <div className="phone-screen">
                    <div className="message-bubble message-1">Had an amazing coffee with Sarah today ☕</div>
                    <div className="message-bubble message-2">Feeling grateful for small moments like these</div>
                    <div className="message-bubble message-3">Tomorrow's goal: morning walk in the park 🌳</div>
                    <div className="message-bubble message-4">Just finished reading an inspiring book 📚</div>
                    <div className="message-bubble message-5">Can't wait for the weekend getaway! ✈️</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-white/30 to-slate-50/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-6">You've been lied to</h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
              Almost everything you've been taught about journaling is wrong. The act of writing something down is more important than how or where it is written. So let's re-write the rules.
            </p>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-white/50 overflow-hidden">
            <div className="grid md:grid-cols-2">
              {/* Old School Journaling Column */}
              <div className="p-8 md:p-12 bg-gradient-to-br from-slate-50/50 to-slate-100/50 border-r border-slate-200/50">
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-slate-500" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-700 mb-2">Old School Journaling</h3>
                  <div className="w-16 h-0.5 bg-slate-300 mx-auto"></div>
                </div>
                
                <div className="space-y-8">
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-slate-100/50">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <X className="w-4 h-4 text-red-500" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">It has to be on physical paper</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">If you don't have a fancy leatherbound notebook, then what's the point?</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-slate-100/50">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <X className="w-4 h-4 text-red-500" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">It has to be long and profound</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">If you're not writing pages and pages of beautiful prose, then why write at all?</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-slate-100/50">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <X className="w-4 h-4 text-red-500" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">It has to be daily</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">If you fall behind, you either have to catchup or quit writing altogether</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-slate-100/50">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <X className="w-4 h-4 text-red-500" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">It has to be perfect</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">If you have bad handwriting, bad grammar, or can't spell, then it's too embarrassing to keep writing</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-slate-100/50">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <X className="w-4 h-4 text-red-500" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">It has to be formatted</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">If journal entries don't all look the same and carry a consistent format then what's the point?</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-slate-100/50">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <X className="w-4 h-4 text-red-500" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">It should be filled with big events</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">If you're not taking unbelievable vacations or doing crazy cool stuff every day, then why write about the mundaneness of your life?</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* New Way Column */}
              <div className="p-8 md:p-12 bg-gradient-to-br from-blue-50/30 to-indigo-50/30">
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">The New Way to Journal</h3>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto"></div>
                </div>
                
                <div className="space-y-8">
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-blue-50/50">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <Check className="w-4 h-4 text-green-600" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Journal anywhere</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">If you've got your phone and can send a text, you can journal. Zero friction.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-blue-50/50">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <Check className="w-4 h-4 text-green-600" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Short is enough</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">If it's one sentence or one photo, that counts. Just capture the thought or moment.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-blue-50/50">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <Check className="w-4 h-4 text-green-600" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Journal when you want</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">If you miss a day? No big deal. We'll send you a friendly reminder the next day.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-blue-50/50">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <Check className="w-4 h-4 text-green-600" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Permission to be messy</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">This is <em>your</em> journal. Typos? No problem. Bad grammar? Who cares.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-blue-50/50">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <Check className="w-4 h-4 text-green-600" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Structure built in</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">Every entry is formatted for you. Multiple entries sent on the same day are combined.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-blue-50/50">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                        <Check className="w-4 h-4 text-green-600" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Your life matters - all of it.</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">Small moments, interesting thoughts, and good memories should all be included. Every day is a gift worth writing about.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-4">If you can text, you can journal</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              We've removed every barrier between you and your thoughts. Here's how we make journaling effortless.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="border-0 shadow-lg bg-white/70 backdrop-blur-sm rounded-lg p-8 text-left">
              <MessageSquare className="w-12 h-12 text-blue-600 mb-6" />
              <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">Text Your Journal</h3>
              <p className="text-slate-600">
                We've eliminated all the friction associated with journaling.
              </p>
            </div>
            <div className="border-0 shadow-lg bg-white/70 backdrop-blur-sm rounded-lg p-8 text-left">
              <Shield className="w-12 h-12 text-green-600 mb-6" />
              <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">Private. Encrypted. Secure.</h3>
              <p className="text-slate-600">
                Your journal is like Fort Knox. No one will read it but you.
              </p>
            </div>
            <div className="border-0 shadow-lg bg-white/70 backdrop-blur-sm rounded-lg p-8 text-left">
              <Download className="w-12 h-12 text-purple-600 mb-6" />
              <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">Export Anytime</h3>
              <p className="text-slate-600">
                Your journal is *yours.* Export it as a PDF or text file whenever.
              </p>
            </div>
            <div className="border-0 shadow-lg bg-white/70 backdrop-blur-sm rounded-lg p-8 text-left">
              <Zap className="w-12 h-12 text-orange-600 mb-6" />
              <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">Insights & Analytics</h3>
              <p className="text-slate-600">
                We help you build momentum by tracking your progress
              </p>
            </div>
            <div className="border-0 shadow-lg bg-white/70 backdrop-blur-sm rounded-lg p-8 text-left">
              <Search className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">Search that works</h3>
              <p className="text-slate-600">
                Find any journal entry instantly with robust search capabilities
              </p>
            </div>
            <div className="border-0 shadow-lg bg-white/70 backdrop-blur-sm rounded-lg p-8 text-left">
              <Clock className="w-12 h-12 text-red-600 mb-6" />
              <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">Daily Reminders</h3>
              <p className="text-slate-600">
                Don't know what to write about? We'll send you a prompt to keep you on track.
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
              It costs less than your favorite drink at Starbucks to create a record of your life. (Start on a free trial today, no credit card required)
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="border-2 border-blue-500 bg-white/70 backdrop-blur-sm rounded-lg">
              <div className="flex flex-col space-y-1.5 p-6 text-center">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">Monthly</h3>
                <p className="text-lg text-muted-foreground">A great place to start</p>
                <div className="text-4xl font-bold text-slate-800 mt-4">$5.99</div>
                <div className="text-slate-600">per month</div>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    No CC required to start
                  </li>
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
                    Advanced search & filtering
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Full export capabilities
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Custom SMS reminders
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Weekly recap messages
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Priority support
                  </li>
                </ul>
                <Link to="/sign-up" className="block">
                  <Button className="w-full mt-6 border-blue-600 text-blue-600 hover:bg-blue-50" variant="outline">
                    Start 10-Day Free Trial
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 relative rounded-lg">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white">
                BEST VALUE
              </Badge>
              <div className="flex flex-col space-y-1.5 p-6 text-center">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">Yearly</h3>
                <p className="text-lg text-muted-foreground">Commit to your journal</p>
                <div className="text-4xl font-bold text-slate-800 mt-4">$49.99</div>
                <div className="text-slate-600">per year</div>
                <div className="text-sm text-slate-500 line-through">$71.88 if billed monthly</div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium mt-4 inline-block">
                  Save 30% over monthly plan
                </div>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    No CC required to start
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Everything in Monthly
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Almost 4 months free (save $22)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Bonus features coming soon
                  </li>
                </ul>
                <Link to="/sign-up" className="block">
                  <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    Start 10-Day Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Third box spanning both columns */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="border-2 border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">Why isn't there a free version?</h3>
              <p className="text-slate-700 leading-relaxed text-lg">
                Free sounds great, but when something costs nothing, we tend to value it the same—at zero. Paying even a little creates commitment, making you far more likely to stick with journaling for months or years, not just a few days. Journaling is important because your life is important. And trust us when we say, your life's memories are worth a whole lot more than $5/month.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-white/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <div className="bg-blue-100 text-blue-700 hover:bg-blue-100 mb-4 px-3 py-1 rounded-full text-sm font-medium inline-block">
              FAQ
            </div>
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-slate-600">
              Everything you need to know about Journal By Text.
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-white/70 backdrop-blur-sm rounded-lg border-0 shadow-sm px-6">
              <AccordionTrigger className="text-left text-lg font-semibold text-slate-800 hover:no-underline">
                How exactly does journaling by text work?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base leading-relaxed pt-2">
                Simply send a text message to your personal journal number and it's automatically saved as a journal entry. Multiple texts sent on the same day are grouped together into a single daily entry. You can include photos with your messages, and everything is organized chronologically for easy viewing through our web interface.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-white/70 backdrop-blur-sm rounded-lg border-0 shadow-sm px-6">
              <AccordionTrigger className="text-left text-lg font-semibold text-slate-800 hover:no-underline">
                What if I don't want to respond to the daily prompts?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base leading-relaxed pt-2">
                Daily prompts are completely optional and designed to inspire you when you're not sure what to write about. You can journal about anything you want, anytime you want. The prompts are just gentle suggestions to help spark ideas when you need them.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-white/70 backdrop-blur-sm rounded-lg border-0 shadow-sm px-6">
              <AccordionTrigger className="text-left text-lg font-semibold text-slate-800 hover:no-underline">
                Can I access my past journal entries?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base leading-relaxed pt-2">
                Yes! You can view, search, and manage all your journal entries through our web application. Our powerful search feature lets you find specific memories by keyword, date, or phrase across your entire journal history. You can also export your entries to PDF or text format anytime.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-white/70 backdrop-blur-sm rounded-lg border-0 shadow-sm px-6">
              <AccordionTrigger className="text-left text-lg font-semibold text-slate-800 hover:no-underline">
                Is my journal private and secure?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base leading-relaxed pt-2">
                Absolutely. Your thoughts are kept safe with industry-standard encryption for data at rest and in transit. Your journal entries are completely private and only accessible by you through your secure account. We take your privacy seriously and will never share your personal thoughts with anyone.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-white/70 backdrop-blur-sm rounded-lg border-0 shadow-sm px-6">
              <AccordionTrigger className="text-left text-lg font-semibold text-slate-800 hover:no-underline">
                Can I cancel my subscription at any time?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base leading-relaxed pt-2">
                Yes, you can cancel your subscription at any time with no questions asked. If you cancel, you'll still have access to your paid features until the end of your current billing period. Your journal entries will always remain accessible to you, even if you downgrade to the free plan.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-white/70 backdrop-blur-sm rounded-lg border-0 shadow-sm px-6">
              <AccordionTrigger className="text-left text-lg font-semibold text-slate-800 hover:no-underline">
                Do I need a special app to use Journal By Text?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base leading-relaxed pt-2">
                No special app required! That's the beauty of Journal By Text - you use your phone's built-in messaging app to send journal entries. For viewing and managing your entries, you simply visit our website through any web browser on your computer, tablet, or phone.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
      <footer className="py-12 px-4 bg-slate-800 text-white" role="contentinfo">
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
    </main>
  );
};

export default Marketing;