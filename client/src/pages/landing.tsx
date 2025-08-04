import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Search, Heart, Music, Monitor, Smartphone } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-navy text-cream" data-testid="page-landing">
      {/* Header */}
      <header className="bg-navy-light px-4 py-4 border-b border-navy-lighter">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo />
          <Button 
            asChild
            className="bg-blue-gradient hover:opacity-90 transition-opacity"
            data-testid="button-login-header"
          >
            <a href="/api/login">Get Started</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" data-testid="heading-hero">
            All Your Streaming
            <br />
            <span className="text-blue-primary">In One Place</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
            Discover, search, and manage content across Netflix, Hulu, Disney+, Spotify, Apple Music, and more. 
            One platform to rule them all.
          </p>
          <Button 
            asChild
            size="lg"
            className="bg-blue-gradient hover:opacity-90 transition-opacity text-lg px-8 py-3"
            data-testid="button-login-hero"
          >
            <a href="/api/login">
              <Play className="w-5 h-5 mr-2" />
              Start Watching
            </a>
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-navy-light border-navy-lighter">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-cream" data-testid="heading-feature-search">
                Universal Search
              </h3>
              <p className="text-gray-400" data-testid="text-feature-search">
                Search across all your streaming platforms at once. Find movies, shows, and music instantly.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-navy-light border-navy-lighter">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-cream" data-testid="heading-feature-favorites">
                Smart Recommendations
              </h3>
              <p className="text-gray-400" data-testid="text-feature-favorites">
                Get personalized recommendations based on your viewing habits across all platforms.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-navy-light border-navy-lighter">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-cream" data-testid="heading-feature-music">
                Music Integration
              </h3>
              <p className="text-gray-400" data-testid="text-feature-music">
                Seamlessly browse and control music from Spotify, Apple Music, and YouTube Music.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Supported Platforms */}
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold mb-8 text-cream" data-testid="heading-platforms">
            Works With Your Favorite Platforms
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { name: 'Netflix', color: 'bg-red-600' },
              { name: 'Hulu', color: 'bg-green-600' },
              { name: 'Disney+', color: 'bg-blue-600' },
              { name: 'HBO Max', color: 'bg-purple-600' },
              { name: 'Spotify', color: 'bg-green-500' },
              { name: 'Apple Music', color: 'bg-gray-800' },
              { name: 'YouTube Music', color: 'bg-red-600' },
              { name: 'Prime Video', color: 'bg-blue-800' },
            ].map((platform) => (
              <div 
                key={platform.name}
                className={`${platform.color} rounded-lg p-4 text-white text-center`}
                data-testid={`platform-${platform.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="text-xs font-bold">{platform.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Compatibility */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-8 text-cream" data-testid="heading-devices">
            Available Everywhere
          </h2>
          <div className="flex justify-center items-center space-x-8">
            <div className="text-center">
              <Monitor className="w-12 h-12 text-blue-primary mx-auto mb-2" />
              <span className="text-sm text-gray-400">Desktop</span>
            </div>
            <div className="text-center">
              <Smartphone className="w-12 h-12 text-blue-primary mx-auto mb-2" />
              <span className="text-sm text-gray-400">Mobile</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-navy-light border-t border-navy-lighter py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <Logo className="justify-center mb-4" />
          <p className="text-gray-400 text-sm" data-testid="text-footer">
            © 2024 Allplay. All rights reserved. Bringing all your content together.
          </p>
        </div>
      </footer>
    </div>
  );
}
