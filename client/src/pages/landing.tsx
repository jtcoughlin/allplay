import { Button } from "@/components/ui/button";
import { Play, Tv, Shield, Zap, Users, Search } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-navy-dark text-cream">
      {/* Header */}
      <header className="border-b border-navy-lighter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-1 text-2xl font-bold text-white">
              <Play className="w-6 h-6 text-blue-primary" />
              <span className="lowercase">allplay</span>
            </div>
            <Button 
              asChild
              className="bg-blue-primary hover:bg-blue-600 text-white border border-blue-primary"
              data-testid="button-login"
            >
              <a href="/api/login">Log In</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <h1 className="text-5xl sm:text-7xl font-bold text-white mb-4">
            TV was broken. We fixed it.
          </h1>
          <p className="text-2xl text-blue-primary mb-8">
            all your streaming in one place
          </p>
          <p className="text-xl text-gray-300 mb-12 max-w-4xl mx-auto">
            Stop jumping between apps. Allplay consolidates Netflix, Hulu, Disney+, Spotify, and more 
            into one unified experience. Watch everything from one interface that becomes your TV's homescreen.
          </p>
          <Button 
            asChild
            size="lg"
            className="bg-blue-primary hover:bg-blue-600 text-white text-xl px-12 py-6 border border-blue-primary"
            data-testid="button-get-started"
          >
            <a href="/api/login">Start Watching</a>
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <div className="bg-gray-900/50 p-8 rounded-lg text-center">
            <Tv className="w-12 h-12 text-blue-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">TV Homescreen</h3>
            <p className="text-gray-300">
              Set Allplay as your default TV interface. Turn on your TV and you're already logged in and ready to watch.
            </p>
          </div>
          
          <div className="bg-gray-900/50 p-8 rounded-lg text-center">
            <Shield className="w-12 h-12 text-blue-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">Universal Login</h3>
            <p className="text-gray-300">
              Connect all your subscriptions once. We securely save your credentials and payment info for seamless access.
            </p>
          </div>
          
          <div className="bg-gray-900/50 p-8 rounded-lg text-center">
            <Search className="w-12 h-12 text-blue-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">Smart Discovery</h3>
            <p className="text-gray-300">
              "You liked Succession, try Severance." Get personalized recommendations across all your services.
            </p>
          </div>
          
          <div className="bg-gray-900/50 p-8 rounded-lg text-center">
            <Play className="w-12 h-12 text-blue-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">Unified Watchlist</h3>
            <p className="text-gray-300">
              One watchlist and "continue watching" across all platforms. Never lose track of what you're watching.
            </p>
          </div>
          
          <div className="bg-gray-900/50 p-8 rounded-lg text-center">
            <Users className="w-12 h-12 text-blue-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">Family Profiles</h3>
            <p className="text-gray-300">
              Manage multiple profiles with parental controls. Each family member gets personalized recommendations.
            </p>
          </div>
          
          <div className="bg-gray-900/50 p-8 rounded-lg text-center">
            <Zap className="w-12 h-12 text-blue-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-3">One UI Everywhere</h3>
            <p className="text-gray-300">
              Same beautiful experience on your TV, phone, tablet, and computer. Your entertainment follows you.
            </p>
          </div>
        </div>

        {/* Brand Story Section */}
        <div className="bg-gray-900/30 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">The Problem We Solved</h2>
          <div className="max-w-4xl mx-auto space-y-6 text-lg text-gray-300">
            <p>
              Remember when you had one remote, one TV guide, and everything just worked? 
              Then streaming happened and suddenly you needed 12 different apps, 12 different logins, 
              and 12 different interfaces just to watch TV.
            </p>
            <p>
              We built Allplay because entertainment should be simple. You shouldn't need to remember 
              which service has which show, or hunt through multiple apps to find something to watch.
            </p>
            <p className="text-white font-semibold">
              Allplay isn't just another streaming service – we're the homescreen that brings all your 
              services together. Watch Netflix shows, Hulu series, Disney movies, and Spotify playlists 
              all from one beautiful interface that never makes you leave.
            </p>
            <p>
              This is how TV should work. Simple, unified, and designed around you – not around corporate app stores.
            </p>
          </div>
          
          <div className="mt-12">
            <Button 
              asChild
              size="lg"
              className="bg-blue-primary hover:bg-blue-600 text-white text-xl px-12 py-6 border border-blue-primary"
              data-testid="button-join-now"
            >
              <a href="/api/login">Join the Revolution</a>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-lighter mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-2xl font-bold text-white mb-4">
              <Play className="w-6 h-6 text-blue-primary" />
              <span className="lowercase">allplay</span>
            </div>
            <p className="text-gray-400 mb-6">TV was broken. We fixed it.</p>
            <div className="flex justify-center space-x-8 text-sm text-gray-400">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Support</span>
              <span>About</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}