import { useState } from "react";
import { Link, useLocation } from "wouter";
import { User, ChevronDown, Grid3X3, List, Home, Settings, LogOut, Search } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  viewMode: 'cards' | 'guide';
  onViewModeChange: (mode: 'cards' | 'guide') => void;
  hideViewToggle?: boolean;
  onSearch?: (query: string) => void;
}

export function Header({ viewMode, onViewModeChange, hideViewToggle = false, onSearch }: HeaderProps) {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = [
    { href: "/", label: "Home", key: "home" },
    { href: "/favorites", label: "Favorites", key: "favorites" },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <header className="bg-navy-light px-2 py-2 border-b border-navy-lighter" data-testid="header-main">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center hover:opacity-80 transition-opacity"
          data-testid="link-home"
        >
          <Logo size="medium" />
        </Link>
        
        {/* Inline Navigation */}
        <nav className="flex items-center space-x-6 text-sm" data-testid="nav-main">
          {navItems.map((item) => (
            <Link 
              key={item.key}
              href={item.href}
              className={`text-cream hover:text-blue-primary transition-colors font-medium ${
                isActive(item.href) ? 'border-b-2 border-blue-primary pb-1' : ''
              }`}
              data-testid={`nav-${item.key}`}
            >
              {item.label}
            </Link>
          ))}
          
          {!hideViewToggle && (
            <>
              <div className="h-4 w-px bg-navy-lighter mx-2" />
              
              <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center space-x-2 text-cream hover:text-blue-primary transition-colors font-medium h-auto p-1"
                data-testid="button-view-toggle"
              >
                {viewMode === 'cards' ? (
                  <Grid3X3 className="w-3 h-3" />
                ) : (
                  <List className="w-3 h-3" />
                )}
                <span className="text-xs capitalize">{viewMode}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-navy-light border-navy-lighter">
              <DropdownMenuItem 
                onClick={() => onViewModeChange('cards')}
                className="text-cream hover:text-blue-primary hover:bg-navy-lighter cursor-pointer"
                data-testid="option-cards-view"
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Cards
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onViewModeChange('guide')}
                className="text-cream hover:text-blue-primary hover:bg-navy-lighter cursor-pointer"
                data-testid="option-guide-view"
              >
                <List className="w-4 h-4 mr-2" />
                Guide
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            </>
          )}
        </nav>
        
        {/* Search Bar */}
        <div className="flex items-center flex-1 max-w-md mx-6">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Input
              type="text"
              placeholder="Search across all platforms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-navy-light border-navy-lighter text-cream placeholder-gray-400 focus:border-blue-primary pl-4 pr-10 text-sm h-8"
              data-testid="input-header-search"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-primary transition-colors"
              data-testid="button-header-search"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
        
        {/* User Profile */}
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-7 h-7 bg-blue-gradient rounded-full flex items-center justify-center p-0"
                data-testid="button-user-menu"
              >
                <User className="w-4 h-4 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-navy-light border-navy-lighter">
              <DropdownMenuItem asChild>
                <Link 
                  href="/" 
                  className="text-cream hover:text-blue-primary hover:bg-navy-lighter cursor-pointer flex items-center"
                  data-testid="link-homepage"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Make Vuno my homepage
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link 
                  href="/profile" 
                  className="text-cream hover:text-blue-primary hover:bg-navy-lighter cursor-pointer flex items-center"
                  data-testid="link-profile"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Profile & Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a 
                  href="/api/logout" 
                  className="text-cream hover:text-blue-primary hover:bg-navy-lighter cursor-pointer flex items-center"
                  data-testid="link-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
