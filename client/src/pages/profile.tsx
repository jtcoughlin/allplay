import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { User, Settings, Link, Shield, Bell, Palette, Tv, Home, MessageSquare, HelpCircle, Send, ExternalLink } from "lucide-react";
import { SiNetflix, SiSpotify, SiAmazonprime, SiYoutube, SiApple } from "react-icons/si";

export default function Profile() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'cards' | 'guide'>('cards');
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; service?: any }>({ isOpen: false });
  const [verificationModal, setVerificationModal] = useState<{ isOpen: boolean; service?: any; connectionType?: string }>({ isOpen: false });

  // Fetch user streaming connections
  const { data: connections = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: ["/api/user/connections"],
    retry: false,
  });

  // Fetch user preferences
  const { data: preferences = {} as any, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ["/api/user/preferences"],
    retry: false,
  });

  const updatePreferences = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", "/api/user/preferences", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your preferences have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const connectService = useMutation({
    mutationFn: async (service: string) => {
      const response = await apiRequest("POST", "/api/user/connect", { service });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.requiresOAuth && data.authUrl) {
        // Redirect to OAuth provider for real authentication
        window.location.href = data.authUrl;
      } else if (data.requiresVerification) {
        // Show verification modal for deep link services
        const currentService = authModal.service;
        console.log('Setting verification modal with service:', currentService);
        console.log('Service ID from variables:', variables);
        console.log('Service data from server:', data);
        
        // Find the service object by ID if authModal.service is undefined
        const serviceObject = currentService || 
          [...streamingServices, ...musicServices].find(s => s.id === variables);
        
        setVerificationModal({
          isOpen: true,
          service: serviceObject,
          connectionType: data.connectionType
        });
        setAuthModal({ isOpen: false });
      } else {
        let description = "Service has been connected successfully.";
        
        if (data.connectionType === 'deeplink') {
          description = data.message || "Connected! Content will open in the service's app when played.";
        } else if (data.connectionType === 'simulated') {
          description = "Demo connection created. Real connection requires API partnership.";
        } else if (data.connectionType === 'unavailable') {
          description = data.message || "Service connection is currently unavailable.";
        }
        
        toast({
          title: data.connectionType === 'unavailable' ? "Connection Unavailable" : "Service Connected", 
          description,
          variant: data.connectionType === 'unavailable' ? "destructive" : "default"
        });
        queryClient.invalidateQueries({ queryKey: ["/api/user/connections"] });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Connection Failed",
        description: "Failed to connect streaming service. Please try again.",
        variant: "destructive",
      });
    },
  });

  const disconnectService = useMutation({
    mutationFn: async (service: string) => {
      const response = await apiRequest("DELETE", `/api/user/connect/${service}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Service Disconnected",
        description: "Streaming service has been disconnected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/connections"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect service. Please try again.",
        variant: "destructive",
      });
    },
  });

  const verifySubscription = useMutation({
    mutationFn: async ({ service, hasSubscription }: { service: string; hasSubscription: boolean }) => {
      const response = await apiRequest("POST", "/api/user/verify-subscription", { service, hasSubscription });
      return response.json();
    },
    onSuccess: (data, variables) => {
      const serviceName = verificationModal.service?.name || 'Service';
      toast({
        title: `${serviceName} Linked Successfully!`,
        description: `${serviceName} is now connected to Vuno. Content will open in the ${serviceName} app when selected.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/connections"] });
      setVerificationModal({ isOpen: false });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Verification Failed",
        description: "Failed to verify subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoadingAuth || !user) {
    return (
      <div className="min-h-screen bg-navy text-cream flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Separate music services
  const musicServices = [
    { id: 'spotify', name: 'Spotify', icon: SiSpotify, color: 'text-green-500', category: 'music' },
    { id: 'apple-music', name: 'Apple Music', icon: User, color: 'text-gray-800', category: 'music' },
  ];

  // Main streaming services
  const streamingServices = [
    { id: 'netflix', name: 'Netflix', icon: SiNetflix, color: 'text-red-600', category: 'video' },
    { id: 'amazon-prime', name: 'Amazon Prime Video', icon: SiAmazonprime, color: 'text-blue-400', category: 'video' },
    { id: 'disney-plus', name: 'Disney+', icon: User, color: 'text-blue-600', category: 'video' },
    { id: 'max', name: 'Max (HBO Max)', icon: User, color: 'text-purple-600', category: 'video' },
    { id: 'paramount-plus', name: 'Paramount+', icon: User, color: 'text-blue-500', category: 'video' },
    { id: 'hulu', name: 'Hulu', icon: User, color: 'text-green-600', category: 'video' },
    { id: 'apple-tv', name: 'Apple TV+', icon: User, color: 'text-gray-600', category: 'video' },
    { id: 'peacock', name: 'Peacock', icon: User, color: 'text-purple-500', category: 'video' },
    { id: 'espn-plus', name: 'ESPN+', icon: User, color: 'text-red-500', category: 'sports' },
    { id: 'starz', name: 'Starz', icon: User, color: 'text-black', category: 'video' },
    { id: 'curiosity-stream', name: 'CuriosityStream', icon: User, color: 'text-orange-500', category: 'documentary' },
    { id: 'tubi', name: 'Tubi', icon: User, color: 'text-orange-600', category: 'free' },
    { id: 'pluto-tv', name: 'Pluto TV', icon: User, color: 'text-purple-400', category: 'free' },
    { id: 'roku-channel', name: 'The Roku Channel', icon: User, color: 'text-purple-700', category: 'free' },
    { id: 'youtube', name: 'YouTube', icon: SiYoutube, color: 'text-red-500', category: 'free' },
    { id: 'youtube-tv', name: 'YouTube TV', icon: SiYoutube, color: 'text-red-600', category: 'live' },
    { id: 'mubi', name: 'Mubi', icon: User, color: 'text-blue-300', category: 'arthouse' },
    { id: 'crunchyroll', name: 'Crunchyroll', icon: User, color: 'text-orange-400', category: 'anime' },
    { id: 'amazon-freevee', name: 'Amazon Freevee', icon: SiAmazonprime, color: 'text-blue-300', category: 'free' },
    { id: 'discovery-plus', name: 'Discovery+', icon: User, color: 'text-blue-700', category: 'documentary' },
  ];

  const connectedServices = Array.isArray(connections) ? connections.map((conn: any) => conn.service) : [];

  return (
    <div className="min-h-screen bg-navy text-cream" data-testid="page-profile">
      <Header viewMode={viewMode} onViewModeChange={setViewMode} />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cream mb-2">Account Settings</h1>
            <p className="text-gray-400">Manage your profile, streaming connections, and preferences</p>
          </div>
          <Button 
            className="bg-blue-primary hover:bg-blue-600 text-white font-bold px-6 py-3 text-lg border border-blue-primary"
            data-testid="button-make-homepage"
          >
            <Home className="w-5 h-5 mr-2" />
            Make Vuno my homepage
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800/50">
            <TabsTrigger value="profile" className="data-[state=active]:bg-blue-primary">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="connections" className="data-[state=active]:bg-blue-primary">
              <Link className="w-4 h-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="preferences" className="data-[state=active]:bg-blue-primary">
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-blue-primary">
              <Shield className="w-4 h-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-blue-primary">
              <HelpCircle className="w-4 h-4 mr-2" />
              Support
            </TabsTrigger>
            <TabsTrigger value="feedback" className="data-[state=active]:bg-blue-primary">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cream">Personal Information</CardTitle>
                <CardDescription className="text-gray-400">
                  Your account details and profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-blue-primary flex items-center justify-center">
                    {user && (user as any).profileImageUrl ? (
                      <img
                        src={(user as any).profileImageUrl}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-cream">
                      {user && ((user as any).firstName || (user as any).lastName)
                        ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim()
                        : 'Vuno User'
                      }
                    </h3>
                    <p className="text-gray-400">{user ? (user as any).email : ''}</p>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-cream">First Name</Label>
                    <Input
                      id="firstName"
                      defaultValue={user ? (user as any).firstName || '' : ''}
                      className="bg-gray-800 border-gray-600 text-cream"
                      data-testid="input-firstname"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-cream">Last Name</Label>
                    <Input
                      id="lastName"
                      defaultValue={user ? (user as any).lastName || '' : ''}
                      className="bg-gray-800 border-gray-600 text-cream"
                      data-testid="input-lastname"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-cream">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user ? (user as any).email || '' : ''}
                    className="bg-gray-800 border-gray-600 text-cream"
                    data-testid="input-email"
                  />
                </div>

                <Button 
                  className="bg-blue-primary hover:bg-blue-600 text-white"
                  data-testid="button-save-profile"
                >
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="connections" className="space-y-6">
            {/* Music Services Section */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cream flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-blue-primary" />
                  Music Services
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Connect your music streaming accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {musicServices.map((service) => {
                    const IconComponent = service.icon;
                    const isConnected = connectedServices.includes(service.id);
                    
                    return (
                      <div key={service.id} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30">
                        <div className="flex items-center space-x-3">
                          <IconComponent className={`w-6 h-6 ${service.color}`} />
                          <span className="text-cream font-medium">{service.name}</span>
                        </div>
                        
                        <Button
                          variant={isConnected ? "outline" : "default"}
                          size="sm"
                          className={
                            isConnected 
                              ? "border-red-600 text-red-400 hover:bg-red-600/10" 
                              : "bg-blue-primary hover:bg-blue-600 text-white border border-blue-primary"
                          }
                          onClick={() => {
                            if (isConnected) {
                              disconnectService.mutate(service.id);
                            } else {
                              setAuthModal({ isOpen: true, service });
                            }
                          }}
                          disabled={connectService.isPending || disconnectService.isPending}
                          data-testid={`button-${service.id}-${isConnected ? 'disconnect' : 'connect'}`}
                        >
                          {isConnected ? 'Disconnect' : 'Connect'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Video Streaming Services */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cream flex items-center">
                  <Tv className="w-5 h-5 mr-2 text-blue-primary" />
                  Video Streaming Services
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Connect all your streaming subscriptions in one place
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {streamingServices.map((service) => {
                    const IconComponent = service.icon;
                    const isConnected = connectedServices.includes(service.id);
                    
                    return (
                      <div key={service.id} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30">
                        <div className="flex items-center space-x-3">
                          <IconComponent className={`w-6 h-6 ${service.color}`} />
                          <div>
                            <span className="text-cream font-medium block">{service.name}</span>
                            <span className="text-xs text-gray-500 capitalize">{service.category}</span>
                          </div>
                        </div>
                        
                        <Button
                          variant={isConnected ? "outline" : "default"}
                          size="sm"
                          className={
                            isConnected 
                              ? "border-red-600 text-red-400 hover:bg-red-600/10" 
                              : "bg-blue-primary hover:bg-blue-600 text-white border border-blue-primary"
                          }
                          onClick={() => {
                            if (isConnected) {
                              disconnectService.mutate(service.id);
                            } else {
                              setAuthModal({ isOpen: true, service });
                            }
                          }}
                          disabled={connectService.isPending || disconnectService.isPending}
                          data-testid={`button-${service.id}-${isConnected ? 'disconnect' : 'connect'}`}
                        >
                          {isConnected ? 'Disconnect' : 'Connect'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Universal Login Section */}
            <Card className="bg-blue-primary/10 border-blue-primary/20">
              <CardHeader>
                <CardTitle className="text-cream flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-blue-primary" />
                  Universal Login
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Save your login credentials securely for seamless access across all services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-cream font-semibold mb-2">How Universal Login Works</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Your credentials are encrypted and stored securely</li>
                    <li>• Automatic login to all connected services</li>
                    <li>• Single sign-on across the Vuno platform</li>
                    <li>• No more remembering multiple passwords</li>
                  </ul>
                </div>
                <Button 
                  className="bg-blue-primary hover:bg-blue-600 text-white border border-blue-primary w-full"
                  data-testid="button-setup-universal-login"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Set Up Universal Login
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cream">Display Preferences</CardTitle>
                <CardDescription className="text-gray-400">
                  Customize how content is displayed and organized
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-cream font-medium">Default View Mode</Label>
                    <p className="text-sm text-gray-400">Choose your preferred content layout</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label className="text-gray-400">Cards</Label>
                    <Switch
                      checked={preferences?.defaultViewMode === 'guide'}
                      onCheckedChange={(checked) =>
                        updatePreferences.mutate({ defaultViewMode: checked ? 'guide' : 'cards' })
                      }
                      data-testid="switch-view-mode"
                    />
                    <Label className="text-gray-400">Guide</Label>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-cream font-medium">Auto-play Previews</Label>
                    <p className="text-sm text-gray-400">Automatically play video previews when hovering</p>
                  </div>
                  <Switch
                    checked={preferences?.autoplayPreviews !== false}
                    onCheckedChange={(checked) =>
                      updatePreferences.mutate({ autoplayPreviews: checked })
                    }
                    data-testid="switch-autoplay"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-cream font-medium">Show Adult Content</Label>
                    <p className="text-sm text-gray-400">Display mature/adult-rated content</p>
                  </div>
                  <Switch
                    checked={preferences?.showAdultContent !== false}
                    onCheckedChange={(checked) =>
                      updatePreferences.mutate({ showAdultContent: checked })
                    }
                    data-testid="switch-adult-content"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cream">Notification Preferences</CardTitle>
                <CardDescription className="text-gray-400">
                  Control when and how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-cream font-medium">New Content Alerts</Label>
                    <p className="text-sm text-gray-400">Get notified when new shows or movies are added</p>
                  </div>
                  <Switch
                    checked={preferences?.newContentAlerts !== false}
                    onCheckedChange={(checked) =>
                      updatePreferences.mutate({ newContentAlerts: checked })
                    }
                    data-testid="switch-new-content"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-cream font-medium">Live Event Reminders</Label>
                    <p className="text-sm text-gray-400">Remind me about upcoming live sports and events</p>
                  </div>
                  <Switch
                    checked={preferences?.liveEventReminders !== false}
                    onCheckedChange={(checked) =>
                      updatePreferences.mutate({ liveEventReminders: checked })
                    }
                    data-testid="switch-live-events"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cream">Privacy & Security</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your privacy settings and data preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-cream font-medium">Watch History Tracking</Label>
                    <p className="text-sm text-gray-400">Allow Vuno to track your viewing history for recommendations</p>
                  </div>
                  <Switch
                    checked={preferences?.trackWatchHistory !== false}
                    onCheckedChange={(checked) =>
                      updatePreferences.mutate({ trackWatchHistory: checked })
                    }
                    data-testid="switch-watch-history"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-cream font-medium">Data Sharing</Label>
                    <p className="text-sm text-gray-400">Share anonymized usage data to improve the platform</p>
                  </div>
                  <Switch
                    checked={preferences?.shareData !== false}
                    onCheckedChange={(checked) =>
                      updatePreferences.mutate({ shareData: checked })
                    }
                    data-testid="switch-data-sharing"
                  />
                </div>

                <Separator className="bg-gray-700" />

                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                    data-testid="button-export-data"
                  >
                    Export My Data
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full border-red-600 text-red-400 hover:bg-red-600/10"
                    data-testid="button-delete-account"
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cream">Help & Support</CardTitle>
                <CardDescription className="text-gray-400">
                  Get help with Vuno features, troubleshooting, and setup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-cream">Getting Started</h3>
                    <div className="space-y-2">
                      <a href="#" className="block text-blue-primary hover:text-blue-400 transition-colors">
                        Setting up your TV homescreen
                      </a>
                      <a href="#" className="block text-blue-primary hover:text-blue-400 transition-colors">
                        Connecting streaming services
                      </a>
                      <a href="#" className="block text-blue-primary hover:text-blue-400 transition-colors">
                        Managing family profiles
                      </a>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-cream">Troubleshooting</h3>
                    <div className="space-y-2">
                      <a href="#" className="block text-blue-primary hover:text-blue-400 transition-colors">
                        Streaming playback issues
                      </a>
                      <a href="#" className="block text-blue-primary hover:text-blue-400 transition-colors">
                        Login and authentication
                      </a>
                      <a href="#" className="block text-blue-primary hover:text-blue-400 transition-colors">
                        Device compatibility
                      </a>
                    </div>
                  </div>
                </div>
                
                <Separator className="bg-gray-700" />
                
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-cream mb-2">Need More Help?</h3>
                  <p className="text-gray-400 mb-4">
                    Contact our support team for personalized assistance
                  </p>
                  <Button 
                    className="bg-blue-primary hover:bg-blue-600 text-white border border-blue-primary"
                    data-testid="button-contact-support"
                  >
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cream">We're on Your Team</CardTitle>
                <CardDescription className="text-gray-400">
                  Help us make Vuno better for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-primary/10 border border-blue-primary/20 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-cream mb-4">
                    We're Not on Team Netflix or Team Hulu. We're on Your Team.
                  </h3>
                  <div className="space-y-3 text-gray-300">
                    <p>
                      Vuno doesn't care where the show lives. We don't have a horse in the race. 
                      We're not trying to push one service over another.
                    </p>
                    <p>
                      We exist to make streaming work for you. Your taste, your time, your subscriptions.
                    </p>
                    <p className="text-white font-semibold">
                      We're not just another app. We're the TV experience you've been waiting for.
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-cream mb-4">Share Your Ideas</h3>
                  <p className="text-gray-400 mb-4">
                    We're the platform of the people. We take your feedback seriously because we want to 
                    make the experience better for you, the customer. Tell us what features you'd love to see.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="feedback-type" className="text-cream">Feedback Type</Label>
                      <select 
                        id="feedback-type"
                        className="w-full mt-1 bg-gray-800 border border-gray-600 text-cream rounded-md px-3 py-2"
                        data-testid="select-feedback-type"
                      >
                        <option value="feature">Feature Request</option>
                        <option value="improvement">Improvement Suggestion</option>
                        <option value="bug">Bug Report</option>
                        <option value="general">General Feedback</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="feedback-message" className="text-cream">Your Feedback</Label>
                      <textarea
                        id="feedback-message"
                        placeholder="Tell us what you think, what features you'd love, or how we can improve Vuno for you..."
                        className="w-full mt-1 bg-gray-800 border border-gray-600 text-cream rounded-md px-3 py-2 h-32 resize-none"
                        data-testid="textarea-feedback"
                      />
                    </div>
                    
                    <Button 
                      className="bg-blue-primary hover:bg-blue-600 text-white border border-blue-primary"
                      data-testid="button-submit-feedback"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Feedback
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Service Authentication Modal */}
      <Dialog open={authModal.isOpen} onOpenChange={(open) => setAuthModal({ isOpen: open })}>
        <DialogContent className="bg-gray-900 border-gray-700 text-cream">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {authModal.service && <authModal.service.icon className={`w-6 h-6 mr-2 ${authModal.service.color}`} />}
              Connect to {authModal.service?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {/* Show different badges based on service type */}
              {['spotify', 'youtube', 'apple-music'].includes(authModal.service?.id) ? (
                <span className="inline-flex items-center px-2 py-1 bg-green-900/30 border border-green-700 rounded text-green-400 text-xs font-medium mr-2">
                  REAL OAUTH
                </span>
              ) : ['netflix', 'disney-plus', 'hulu', 'amazon-prime', 'max', 'apple-tv', 'paramount-plus', 'peacock'].includes(authModal.service?.id) ? (
                <span className="inline-flex items-center px-2 py-1 bg-orange-900/30 border border-orange-700 rounded text-orange-400 text-xs font-medium mr-2">
                  DEEP LINK
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 bg-blue-900/30 border border-blue-700 rounded text-blue-400 text-xs font-medium mr-2">
                  DEMO MODE
                </span>
              )}
              
              {['spotify', 'youtube', 'apple-music'].includes(authModal.service?.id) ? (
                `You'll be redirected to ${authModal.service?.name} for real authentication with your existing account.`
              ) : ['netflix', 'disney-plus', 'hulu', 'amazon-prime', 'max', 'apple-tv', 'paramount-plus', 'peacock'].includes(authModal.service?.id) ? (
                `This links ${authModal.service?.name} to Vuno. Content will open in the ${authModal.service?.name} app using your existing login.`
              ) : (
                `This simulates connecting to ${authModal.service?.name}. Real connection requires API partnerships.`
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* OAuth Services */}
            {['spotify', 'youtube', 'apple-music'].includes(authModal.service?.id) && (
              <div className="bg-green-primary/10 border border-green-primary/20 rounded-lg p-4">
                <h4 className="font-semibold text-cream mb-2">Real OAuth Authentication:</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• You'll log in with your existing {authModal.service?.name} account</li>
                  <li>• Your credentials are encrypted and stored securely</li>
                  <li>• Content from {authModal.service?.name} will appear in Vuno</li>
                  <li>• Full API integration with real data</li>
                </ul>
              </div>
            )}
            
            {/* Deep Link Services */}
            {['netflix', 'disney-plus', 'hulu', 'amazon-prime', 'max', 'apple-tv', 'paramount-plus', 'peacock'].includes(authModal.service?.id) && (
              <div className="bg-orange-primary/10 border border-orange-primary/20 rounded-lg p-4">
                <h4 className="font-semibold text-cream mb-2">App Integration (No Login Required):</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Links to your existing {authModal.service?.name} subscription</li>
                  <li>• Content opens directly in the {authModal.service?.name} app</li>
                  <li>• Returns to Vuno when you're done watching</li>
                  <li>• Uses your device's existing {authModal.service?.name} login</li>
                  <li>• No username/password needed in Vuno</li>
                </ul>
              </div>
            )}
            
            {/* Other Services */}
            {!['spotify', 'youtube', 'apple-music', 'netflix', 'disney-plus', 'hulu', 'amazon-prime', 'max', 'apple-tv', 'paramount-plus', 'peacock'].includes(authModal.service?.id) && (
              <div className="bg-blue-primary/10 border border-blue-primary/20 rounded-lg p-4">
                <h4 className="font-semibold text-cream mb-2">Demo Connection:</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Simulates connection for demonstration</li>
                  <li>• Shows how Vuno would work with this service</li>
                  <li>• Real connection requires API partnerships</li>
                  <li>• Content appears in the unified interface</li>
                </ul>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setAuthModal({ isOpen: false })}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (authModal.service) {
                    setAuthModal({ isOpen: false });
                    
                    // Simulate authentication delay
                    toast({
                      title: "Demo Connection Started",
                      description: `Simulating connection to ${authModal.service.name}`,
                    });
                    
                    setTimeout(async () => {
                      try {
                        await connectService.mutateAsync(authModal.service.id);
                        toast({
                          title: "Service Connected",
                          description: `Successfully connected to ${authModal.service.name}`,
                        });
                      } catch (error) {
                        toast({
                          title: "Connection Failed",
                          description: `Failed to connect to ${authModal.service.name}. Please try again.`,
                          variant: "destructive",
                        });
                      }
                    }, 2000);
                  }
                }}
                className="flex-1 bg-blue-primary hover:bg-blue-600 text-white"
                data-testid="button-authenticate-service"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {['spotify', 'youtube', 'apple-music'].includes(authModal.service?.id) 
                  ? `Connect to ${authModal.service?.name}`
                  : ['netflix', 'disney-plus', 'hulu', 'amazon-prime', 'max', 'apple-tv', 'paramount-plus', 'peacock'].includes(authModal.service?.id)
                  ? `Link ${authModal.service?.name} App`
                  : `Demo Connect to ${authModal.service?.name}`
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscription Verification Modal */}
      <Dialog open={verificationModal.isOpen} onOpenChange={(open) => setVerificationModal({ isOpen: open })}>
        <DialogContent className="bg-gray-900 border-gray-700 text-cream">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {verificationModal.service && <verificationModal.service.icon className={`w-6 h-6 mr-2 ${verificationModal.service.color}`} />}
              Verify {verificationModal.service?.name} Subscription
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              <span className="inline-flex items-center px-2 py-1 bg-orange-900/30 border border-orange-700 rounded text-orange-400 text-xs font-medium mr-2">
                DEEP LINK
              </span>
              To connect {verificationModal.service?.name}, please confirm you have an active subscription.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-orange-primary/10 border border-orange-primary/20 rounded-lg p-4">
              <h4 className="font-semibold text-cream mb-2">How {verificationModal.service?.name} Integration Works</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Requires an active {verificationModal.service?.name} subscription</li>
                <li>• Content opens directly in the {verificationModal.service?.name} app</li>
                <li>• Uses your device's existing {verificationModal.service?.name} login</li>
                <li>• Returns to Vuno when you're done watching</li>
                <li>• No need to enter credentials in Vuno</li>
              </ul>
            </div>
            
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">Privacy & Security</span>
              </div>
              <p className="text-xs text-gray-300">
                Vuno never stores your {verificationModal.service?.name} login credentials. 
                We only link to content that opens in their official app using your existing device login.
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-300 mb-4">
                Do you have an active {verificationModal.service?.name} subscription?
              </p>
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    const serviceId = verificationModal.service?.id;
                    console.log('Verifying subscription - No:', { 
                      service: serviceId, 
                      hasSubscription: false,
                      serviceObject: verificationModal.service 
                    });
                    if (serviceId) {
                      verifySubscription.mutate({ 
                        service: serviceId, 
                        hasSubscription: false 
                      });
                    } else {
                      console.error('No service ID available for verification');
                    }
                  }}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-400 hover:text-cream"
                  disabled={verifySubscription.isPending}
                  data-testid="button-no-subscription"
                >
                  No, I don't have a subscription
                </Button>
                
                <Button
                  onClick={() => {
                    const serviceId = verificationModal.service?.id;
                    console.log('Verifying subscription - Yes:', { 
                      service: serviceId, 
                      hasSubscription: true,
                      serviceObject: verificationModal.service 
                    });
                    if (serviceId) {
                      verifySubscription.mutate({ 
                        service: serviceId, 
                        hasSubscription: true 
                      });
                    } else {
                      console.error('No service ID available for verification');
                    }
                  }}
                  className="flex-1 bg-blue-primary hover:bg-blue-600 text-white"
                  disabled={verifySubscription.isPending}
                  data-testid="button-confirm-subscription"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {verifySubscription.isPending ? 'Connecting...' : 'Yes, I have a subscription'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}