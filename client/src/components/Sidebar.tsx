import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Music, 
  Search, 
  Heart, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Tv,
  Settings,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}



export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();

  const navigationItems = [
    {
      title: "Home",
      href: "/",
      icon: Home,
      active: location === "/",
      testId: "nav-home"
    },
    {
      title: "Search",
      href: "/search", 
      icon: Search,
      active: location === "/search",
      testId: "nav-search"
    },
    {
      title: "TV & Movies",
      href: "/",
      icon: Tv,
      active: location === "/" || location === "/favorites",
      testId: "nav-tv-movies"
    },
    {
      title: "Music",
      href: "/music",
      icon: Music,
      active: location === "/music",
      testId: "nav-music"
    }
  ];

  const libraryItems = [
    {
      title: "Favorites",
      href: "/favorites",
      icon: Heart,
      active: location === "/favorites",
      testId: "nav-favorites"
    },
    {
      title: "Profile",
      href: "/profile",
      icon: User,
      active: location === "/profile",
      testId: "nav-profile"
    }
  ];

  return (
    <div 
      className={cn(
        "h-screen bg-navy-light border-r border-navy-lighter transition-all duration-300 z-40 flex-shrink-0 relative",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
      data-testid="sidebar"
    >
      {/* Toggle Button */}
      <div className="absolute -right-3 top-6 z-50">
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          variant="outline"
          size="sm"
          className="h-6 w-6 rounded-full bg-navy border-navy-lighter hover:bg-navy-lighter p-0"
          data-testid="button-toggle-sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-cream" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-cream" />
          )}
        </Button>
      </div>

      <div className="flex flex-col h-full">
        {/* Logo/Brand - Clickable to toggle sidebar */}
        <div 
          className="p-4 border-b border-navy-lighter cursor-pointer hover:bg-navy-lighter transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
          data-testid="button-brand-toggle"
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-gradient rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-cream" data-testid="text-brand">
                  AllPlay
                </h1>
                <p className="text-xs text-gray-400" data-testid="text-tagline">
                  TV was broken. We fixed it.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left h-10 px-3",
                    isCollapsed ? "px-2" : "px-3",
                    item.active 
                      ? "bg-blue-gradient text-white hover:bg-blue-primary" 
                      : "text-gray-300 hover:text-cream hover:bg-navy-lighter"
                  )}
                  data-testid={item.testId}
                >
                  <item.icon className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "mr-3")} />
                  {!isCollapsed && (
                    <span className="truncate">{item.title}</span>
                  )}
                </Button>
              </Link>
            ))}
          </div>

          {/* Separator */}
          {!isCollapsed && (
            <div className="py-2">
              <hr className="border-navy-lighter" />
            </div>
          )}

          {/* Library Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider" data-testid="text-library-heading">
                  Your Library
                </p>
              </div>
            )}
            
            {libraryItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left h-10 px-3",
                    isCollapsed ? "px-2" : "px-3",
                    item.active 
                      ? "bg-blue-gradient text-white hover:bg-blue-primary" 
                      : "text-gray-300 hover:text-cream hover:bg-navy-lighter"
                  )}
                  data-testid={item.testId}
                >
                  <item.icon className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "mr-3")} />
                  {!isCollapsed && (
                    <span className="truncate">{item.title}</span>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-navy-lighter">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-left h-10 px-3 text-gray-300 hover:text-cream hover:bg-navy-lighter",
              isCollapsed ? "px-2" : "px-3"
            )}
            data-testid="nav-settings"
          >
            <Settings className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "mr-3")} />
            {!isCollapsed && (
              <span className="truncate">Settings</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}