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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { User, Settings, Link, Shield, Bell, Palette, Tv } from "lucide-react";
import { SiNetflix, SiSpotify, SiAmazonprime, SiYoutube } from "react-icons/si";

export default function Profile() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'cards' | 'guide'>('cards');

  // Fetch user streaming connections
  const { data: connections = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: ["/api/user/connections"],
    retry: false,
  });

  // Fetch user preferences
  const { data: preferences = {}, isLoading: isLoadingPreferences } = useQuery({
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
    onSuccess: (data) => {
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=500,height=600');
      }
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

  if (isLoadingAuth || !user) {
    return (
      <div className="min-h-screen bg-navy text-cream flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const streamingServices = [
    { id: 'netflix', name: 'Netflix', icon: SiNetflix, color: 'text-red-600' },
    { id: 'disney', name: 'Disney+', icon: User, color: 'text-blue-600' },
    { id: 'hulu', name: 'Hulu', icon: User, color: 'text-green-600' },
    { id: 'hbo', name: 'HBO Max', icon: User, color: 'text-purple-600' },
    { id: 'spotify', name: 'Spotify', icon: SiSpotify, color: 'text-green-500' },
    { id: 'apple', name: 'Apple TV+', icon: User, color: 'text-gray-800' },
    { id: 'prime', name: 'Prime Video', icon: SiAmazonprime, color: 'text-blue-400' },
    { id: 'youtube', name: 'YouTube TV', icon: SiYoutube, color: 'text-red-500' },
  ];

  const connectedServices = connections.map((conn: any) => conn.service);

  return (
    <div className="min-h-screen bg-navy text-cream" data-testid="page-profile">
      <Header viewMode={viewMode} onViewModeChange={setViewMode} />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cream mb-2">Account Settings</h1>
          <p className="text-gray-400">Manage your profile, streaming connections, and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/50">
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
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-cream">
                      {user.firstName || user.lastName 
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        : 'Allplay User'
                      }
                    </h3>
                    <p className="text-gray-400">{user.email}</p>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-cream">First Name</Label>
                    <Input
                      id="firstName"
                      defaultValue={user.firstName || ''}
                      className="bg-gray-800 border-gray-600 text-cream"
                      data-testid="input-firstname"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-cream">Last Name</Label>
                    <Input
                      id="lastName"
                      defaultValue={user.lastName || ''}
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
                    defaultValue={user.email || ''}
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

          {/* Streaming Services Tab */}
          <TabsContent value="connections" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cream">Universal Login</CardTitle>
                <CardDescription className="text-gray-400">
                  Connect all your streaming services once. Allplay securely saves your credentials and payment info for seamless access. Watch everything from one interface - no more app switching.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {streamingServices.map((service) => {
                    const isConnected = connectedServices.includes(service.id);
                    const IconComponent = service.icon;
                    
                    return (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30"
                      >
                        <div className="flex items-center space-x-3">
                          <IconComponent className={`w-6 h-6 ${service.color}`} />
                          <span className="font-medium text-cream">{service.name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isConnected && (
                            <Badge variant="secondary" className="bg-green-600 text-white">
                              Connected
                            </Badge>
                          )}
                          
                          <Button
                            variant={isConnected ? "outline" : "default"}
                            size="sm"
                            onClick={() => 
                              isConnected 
                                ? disconnectService.mutate(service.id)
                                : connectService.mutate(service.id)
                            }
                            disabled={connectService.isPending || disconnectService.isPending}
                            className={isConnected 
                              ? "border-gray-600 text-gray-300 hover:bg-gray-800" 
                              : "bg-blue-primary hover:bg-blue-600 text-white"
                            }
                            data-testid={`button-${service.id}-${isConnected ? 'disconnect' : 'connect'}`}
                          >
                            {isConnected ? 'Disconnect' : 'Connect'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <Separator className="bg-gray-700" />
                
                <div className="bg-blue-primary/10 border border-blue-primary/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Tv className="w-5 h-5 text-blue-primary" />
                    <span className="font-semibold text-cream">TV Homescreen Mode</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    Set Allplay as your TV's default homescreen. When you turn on your TV, you'll be automatically logged in and ready to watch from any connected service.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-blue-primary text-blue-primary hover:bg-blue-primary hover:text-white"
                    data-testid="button-tv-homescreen"
                  >
                    Enable TV Homescreen
                  </Button>
                </div>
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
                      checked={preferences.defaultViewMode === 'guide'}
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
                    checked={preferences.autoplayPreviews !== false}
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
                    checked={preferences.showAdultContent !== false}
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
                    checked={preferences.newContentAlerts !== false}
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
                    checked={preferences.liveEventReminders !== false}
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
                    <p className="text-sm text-gray-400">Allow Allplay to track your viewing history for recommendations</p>
                  </div>
                  <Switch
                    checked={preferences.trackWatchHistory !== false}
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
                    checked={preferences.shareData !== false}
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
        </Tabs>
      </main>
    </div>
  );
}