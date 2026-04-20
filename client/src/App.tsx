import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/Sidebar";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import HomeV2 from "@/pages/home-v2";

import Favorites from "@/pages/favorites";
import Preferences from "@/pages/preferences";
import Profile from "@/pages/profile";
import Music from "@/pages/music";
import { MediaCardTest } from "@/pages/MediaCardTest";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/test-media" component={MediaCardTest} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-hidden relative">
      <Sidebar />
      <main className="transition-all duration-300 min-w-0 overflow-auto" style={{marginLeft: 'var(--sidebar-width, 256px)'}}>
        <style>{`
          :root {
            --sidebar-width: 256px;
          }
          .sidebar-collapsed {
            --sidebar-width: 64px;
          }
        `}</style>
        <Switch>
          <Route path="/" component={HomeV2} />
          <Route path="/favorites" component={Favorites} />
          <Route path="/preferences" component={Preferences} />
          <Route path="/profile" component={Profile} />
          <Route path="/music" component={Music} />
          <Route path="/test-media" component={MediaCardTest} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-navy text-cream">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
