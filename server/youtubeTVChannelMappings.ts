// YouTube TV channel-specific deep link mappings
// These URLs are direct links to specific channels on YouTube TV

export interface ChannelMapping {
  channelId: string;
  webUrl: string;
  appUrl: string;
  displayName: string;
}

export const youtubeTVChannels: Record<string, ChannelMapping> = {
  'abc': {
    channelId: 'abc',
    webUrl: 'https://tv.youtube.com/watch/Cy-DXnSXdY0?vp=0gEEEgIwAQ%3D%3D',
    appUrl: 'youtubetv://browse/channel/abc',
    displayName: 'ABC'
  },
  'cbs': {
    channelId: 'cbs', 
    webUrl: 'https://tv.youtube.com/watch/CBS',
    appUrl: 'youtubetv://browse/channel/cbs',
    displayName: 'CBS'
  },
  'nbc': {
    channelId: 'nbc',
    webUrl: 'https://tv.youtube.com/watch/NBC', 
    appUrl: 'youtubetv://browse/channel/nbc',
    displayName: 'NBC'
  },
  'fox': {
    channelId: 'fox',
    webUrl: 'https://tv.youtube.com/watch/FOX',
    appUrl: 'youtubetv://browse/channel/fox', 
    displayName: 'FOX'
  },
  'pbs': {
    channelId: 'pbs',
    webUrl: 'https://tv.youtube.com/watch/PBS',
    appUrl: 'youtubetv://browse/channel/pbs',
    displayName: 'PBS'
  },
  'cnn': {
    channelId: 'cnn',
    webUrl: 'https://tv.youtube.com/watch/CNN',
    appUrl: 'youtubetv://browse/channel/cnn',
    displayName: 'CNN'
  },
  'espn': {
    channelId: 'espn',
    webUrl: 'https://tv.youtube.com/watch/ESPN',
    appUrl: 'youtubetv://browse/channel/espn',
    displayName: 'ESPN'
  },
  'tnt': {
    channelId: 'tnt',
    webUrl: 'https://tv.youtube.com/watch/TNT',
    appUrl: 'youtubetv://browse/channel/tnt',
    displayName: 'TNT'
  },
  'tbs': {
    channelId: 'tbs',
    webUrl: 'https://tv.youtube.com/watch/TBS',
    appUrl: 'youtubetv://browse/channel/tbs', 
    displayName: 'TBS'
  },
  'fs1': {
    channelId: 'fs1',
    webUrl: 'https://tv.youtube.com/watch/FS1',
    appUrl: 'youtubetv://browse/channel/fs1',
    displayName: 'FS1'
  },
  'fs2': {
    channelId: 'fs2', 
    webUrl: 'https://tv.youtube.com/watch/FS2',
    appUrl: 'youtubetv://browse/channel/fs2',
    displayName: 'FS2'
  },
  'disney': {
    channelId: 'disney',
    webUrl: 'https://tv.youtube.com/watch/DISNEY',
    appUrl: 'youtubetv://browse/channel/disney',
    displayName: 'Disney Channel'
  },
  'nick': {
    channelId: 'nick',
    webUrl: 'https://tv.youtube.com/watch/NICK',
    appUrl: 'youtubetv://browse/channel/nick',
    displayName: 'Nickelodeon'
  },
  'cartoon': {
    channelId: 'cartoon', 
    webUrl: 'https://tv.youtube.com/watch/CARTOON',
    appUrl: 'youtubetv://browse/channel/cartoon',
    displayName: 'Cartoon Network'
  },
  'comedy': {
    channelId: 'comedy',
    webUrl: 'https://tv.youtube.com/watch/COMEDY',
    appUrl: 'youtubetv://browse/channel/comedy',
    displayName: 'Comedy Central'
  },
  'mtv': {
    channelId: 'mtv',
    webUrl: 'https://tv.youtube.com/watch/MTV',
    appUrl: 'youtubetv://browse/channel/mtv',
    displayName: 'MTV'
  },
  'fx': {
    channelId: 'fx',
    webUrl: 'https://tv.youtube.com/watch/FX',
    appUrl: 'youtubetv://browse/channel/fx',
    displayName: 'FX'
  },
  'amc': {
    channelId: 'amc',
    webUrl: 'https://tv.youtube.com/watch/AMC', 
    appUrl: 'youtubetv://browse/channel/amc',
    displayName: 'AMC'
  },
  'discovery': {
    channelId: 'discovery',
    webUrl: 'https://tv.youtube.com/watch/DISCOVERY',
    appUrl: 'youtubetv://browse/channel/discovery',
    displayName: 'Discovery Channel'
  },
  'natgeo': {
    channelId: 'natgeo',
    webUrl: 'https://tv.youtube.com/watch/NATGEO',
    appUrl: 'youtubetv://browse/channel/natgeo',
    displayName: 'National Geographic'
  },
  'hallmark': {
    channelId: 'hallmark',
    webUrl: 'https://tv.youtube.com/watch/HALLMARK',
    appUrl: 'youtubetv://browse/channel/hallmark', 
    displayName: 'Hallmark Channel'
  },
  'cmt': {
    channelId: 'cmt',
    webUrl: 'https://tv.youtube.com/watch/CMT',
    appUrl: 'youtubetv://browse/channel/cmt',
    displayName: 'CMT'
  },
  'trutv': {
    channelId: 'trutv',
    webUrl: 'https://tv.youtube.com/watch/TRUTV',
    appUrl: 'youtubetv://browse/channel/trutv',
    displayName: 'truTV'
  },
  'bbc': {
    channelId: 'bbc',
    webUrl: 'https://tv.youtube.com/watch/BBC',
    appUrl: 'youtubetv://browse/channel/bbc',
    displayName: 'BBC America'
  }
};

// Helper function to get channel URL for a specific channel
export function getYouTubeTVChannelUrl(channelId: string): { webUrl: string; appUrl: string } | null {
  const channel = youtubeTVChannels[channelId];
  if (!channel) return null;
  
  return {
    webUrl: channel.webUrl,
    appUrl: channel.appUrl
  };
}

// Helper function to get all available channels
export function getAvailableChannels(): string[] {
  return Object.keys(youtubeTVChannels);
}