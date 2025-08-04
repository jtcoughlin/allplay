import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ExternalLink, Music as MusicIcon, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Content } from "@shared/schema";

export default function Music() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch user connections to see which music services are connected
  const { data: connections = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: ["/api/user/connections"],
    retry: false,
  });

  // Connect to service mutation
  const connectService = useMutation({
    mutationFn: async (service: string) => {
      const response = await apiRequest("POST", "/api/user/connect", { service });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        // For OAuth services like Spotify, redirect to auth URL
        window.open(data.authUrl, '_blank');
      } else if (data.requiresVerification) {
        // For subscription verification services
        toast({
          title: "Service Connection",
          description: "Please verify your subscription to complete the connection.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user/connections"] });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to the music service",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return null;
  }

  const musicServices = [
    {
      id: 'spotify',
      name: 'Spotify',
      description: 'Stream millions of songs and playlists',
      icon: '🎵',
      color: 'bg-green-600',
      url: 'https://open.spotify.com/',
      type: 'oauth'
    },
    {
      id: 'apple-music',
      name: 'Apple Music',
      description: 'Access your Apple Music library and playlists',
      icon: '🍎',
      color: 'bg-black',
      url: 'https://music.apple.com/',
      type: 'oauth'
    }
  ];

  const connectedServices = (connections as any[]).filter(conn => 
    musicServices.some(service => service.id === conn.service)
  );

  const handleOpenService = (service: typeof musicServices[0]) => {
    window.open(service.url, '_blank');
  };

  const handleConnectService = (serviceId: string) => {
    connectService.mutate(serviceId);
  };

  const isServiceConnected = (serviceId: string) => {
    return connectedServices.some(conn => conn.service === serviceId);
  };

  const ServiceCard = ({ service }: { service: typeof musicServices[0] }) => {
    const isConnected = isServiceConnected(service.id);
    
    return (
      <Card 
        className="bg-navy-light hover:bg-navy-lighter transition-colors cursor-pointer group border-navy-lighter"
        data-testid={`card-service-${service.id}`}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-lg ${service.color} flex items-center justify-center text-2xl`}>
                {service.icon}
              </div>
              
              <div className="flex-1">
                <h3 
                  className="text-lg font-semibold text-cream" 
                  data-testid={`text-service-name-${service.id}`}
                >
                  {service.name}
                </h3>
                <p 
                  className="text-sm text-gray-400 mt-1" 
                  data-testid={`text-service-description-${service.id}`}
                >
                  {service.description}
                </p>
                {isConnected && (
                  <div className="flex items-center mt-2">
                    <Check className="w-4 h-4 text-green-400 mr-1" />
                    <span className="text-xs text-green-400" data-testid={`text-connected-${service.id}`}>
                      Connected
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              {!isConnected && (
                <Button
                  onClick={() => handleConnectService(service.id)}
                  disabled={connectService.isPending}
                  className="bg-blue-gradient hover:bg-blue-primary text-white"
                  data-testid={`button-connect-${service.id}`}
                >
                  {connectService.isPending ? "Connecting..." : "Connect"}
                </Button>
              )}
              
              <Button
                onClick={() => handleOpenService(service)}
                variant="outline"
                className="border-navy-lighter text-cream hover:bg-navy-lighter"
                data-testid={`button-open-${service.id}`}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open {service.name}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-navy text-cream">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-navy border-b border-navy-lighter">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-cream" data-testid="heading-music">
                Music
              </h1>
              <p className="text-sm text-gray-400 mt-1" data-testid="text-music-subtitle">
                Connect your music services to access your content
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <div className="space-y-6">
          {/* Connected Services Status */}
          {connectedServices.length > 0 && (
            <div className="bg-navy-light border border-navy-lighter rounded-lg p-4">
              <h3 className="text-sm font-medium text-cream mb-2" data-testid="heading-connected-services">
                Connected Services
              </h3>
              <div className="flex flex-wrap gap-2">
                {connectedServices.map((service: any) => (
                  <div 
                    key={service.id}
                    className="bg-navy-lighter px-3 py-1 rounded-full text-xs text-cream"
                    data-testid={`badge-connected-${service.service}`}
                  >
                    {musicServices.find(s => s.id === service.service)?.name || service.service}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Music Services */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-cream" data-testid="heading-music-services">
                Music Services
              </h2>
              <p className="text-sm text-gray-400" data-testid="text-services-count">
                {musicServices.length} services available
              </p>
            </div>
            
            {isLoadingConnections ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-24 bg-navy-light rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {musicServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="bg-navy-light border border-navy-lighter rounded-lg p-6">
            <h3 className="text-lg font-semibold text-cream mb-4" data-testid="heading-how-it-works">
              How It Works
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-gradient rounded-full flex items-center justify-center text-white text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="text-cream font-medium">Connect Your Services</p>
                  <p className="text-sm text-gray-400">Link your Spotify or Apple Music account securely through OAuth</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-gradient rounded-full flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
                <div>
                  <p className="text-cream font-medium">Access Native Apps</p>
                  <p className="text-sm text-gray-400">Click "Open" to launch directly into your music service's app</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-gradient rounded-full flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
                <div>
                  <p className="text-cream font-medium">Seamless Experience</p>
                  <p className="text-sm text-gray-400">Return to AllPlay anytime to switch between TV, movies, and music</p>
                </div>
              </div>
            </div>
          </div>

          {/* No Services Connected */}
          {connectedServices.length === 0 && !isLoadingConnections && (
            <div className="text-center py-12">
              <MusicIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-cream mb-2" data-testid="heading-no-services">
                No Music Services Connected
              </h3>
              <p className="text-gray-400 mb-6" data-testid="text-connect-prompt">
                Connect to Spotify or Apple Music to access your music library and playlists
              </p>
              <Button
                onClick={() => handleConnectService('spotify')}
                className="bg-green-600 hover:bg-green-700 text-white mr-3"
                data-testid="button-quick-connect-spotify"
              >
                Connect Spotify
              </Button>
              <Button
                onClick={() => handleConnectService('apple-music')}
                className="bg-black hover:bg-gray-800 text-white"
                data-testid="button-quick-connect-apple"
              >
                Connect Apple Music
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}