import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface LiveProgram {
  id: string;
  title: string;
  showTitle: string;
  episodeTitle?: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  channel: string;
  network: string;
  genre: string[];
  rating?: number;
  imageUrl?: string;
  season?: number;
  episode?: number;
  isLive: boolean;
}

// Hook to get currently airing programs
export function useCurrentlyAiring() {
  return useQuery({
    queryKey: ['live-tv', 'currently-airing'],
    queryFn: async () => {
      const response = await fetch('/api/live-tv/currently-airing');
      if (!response.ok) throw new Error('Failed to fetch currently airing programs');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
}

// Hook to get supported channels
export function useSupportedChannels() {
  return useQuery({
    queryKey: ['live-tv', 'channels'],
    queryFn: async () => {
      const response = await fetch('/api/live-tv/channels');
      if (!response.ok) throw new Error('Failed to fetch channels');
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // Channels don't change often
  });
}

// Hook to get program guide for a specific channel
export function useChannelGuide(channelId: string, hours: number = 6) {
  return useQuery({
    queryKey: ['live-tv', 'channel-guide', channelId, hours],
    queryFn: async () => {
      const response = await fetch(`/api/live-tv/channel/${channelId}/guide?hours=${hours}`);
      if (!response.ok) throw new Error('Failed to fetch channel guide');
      return response.json();
    },
    enabled: !!channelId,
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
  });
}

// Hook to manually sync Live TV data
export function useSyncLiveTV() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/live-tv/sync', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to sync live TV data');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all live TV queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['live-tv'] });
      queryClient.invalidateQueries({ queryKey: ['/api/content'] });
    },
  });
}

// Hook to sync specific channels
export function useSyncChannels() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (channels: string[]) => {
      const response = await fetch('/api/live-tv/sync-channels', { 
        method: 'POST', 
        body: JSON.stringify({ channels }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to sync channels');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['live-tv'] });
      queryClient.invalidateQueries({ queryKey: ['/api/content'] });
    },
  });
}

// Helper function to check if a program is currently airing
export function isProgramCurrentlyAiring(program: LiveProgram): boolean {
  const now = new Date().getTime();
  const startTime = new Date(program.startTime).getTime();
  const endTime = new Date(program.endTime).getTime();
  
  return now >= startTime && now <= endTime;
}

// Helper function to format program time display
export function formatProgramTime(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  return `${formatTime(start)} - ${formatTime(end)}`;
}

// Helper function to get time until program starts
export function getTimeUntilStart(startTime: string): string {
  const now = new Date().getTime();
  const start = new Date(startTime).getTime();
  const diff = start - now;
  
  if (diff <= 0) return 'Now';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }
  return `in ${minutes}m`;
}