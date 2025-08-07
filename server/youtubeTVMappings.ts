// Manual mappings for YouTube TV shows that have TMDB entries but need exact title matching
export const youtubeTVMappings: Record<string, string> = {
  // Animated shows
  "American Dad!": "American Dad!",
  "Family Guy": "Family Guy", 
  "The Simpsons": "The Simpsons",
  "South Park": "South Park",
  "Adventure Time": "Adventure Time",
  "Steven Universe": "Steven Universe",
  "SpongeBob SquarePants": "SpongeBob SquarePants",
  "The Loud House": "The Loud House",
  
  // Drama/Crime shows
  "Better Call Saul": "Better Call Saul",
  "Animal Kingdom": "Animal Kingdom",
  "Atlanta": "Atlanta",
  "American Horror Story": "American Horror Story",
  "Nashville": "Nashville",
  "When Calls the Heart": "When Calls the Heart",
  "The Closer": "The Closer",
  
  // Comedy shows  
  "The Big Bang Theory": "The Big Bang Theory",
  "Impractical Jokers": "Impractical Jokers",
  "The Carbonaro Effect": "The Carbonaro Effect",
  
  // Late night/talk shows (some have TMDB entries)
  "The Daily Show": "The Daily Show",
  "The Late Show with Stephen Colbert": "The Late Show with Stephen Colbert",
  "The Tonight Show Starring Jimmy Fallon": "The Tonight Show Starring Jimmy Fallon",
  
  // Reality/competition shows
  "Teen Mom": "Teen Mom",
  "Ridiculousness": "Ridiculousness",
  "Deadliest Catch": "Deadliest Catch",
  
  // Documentary shows
  "Planet Earth II": "Planet Earth II",
  "MythBusters": "MythBusters",
  "Cosmos: A Spacetime Odyssey": "Cosmos: A Spacetime Odyssey",
  "Wild Yellowstone": "Yellowstone", // Sometimes named differently
};

// Shows that are unlikely to have TMDB posters (news, sports, music videos)
export const nonPosterShows = new Set([
  "NBA Tip-Off",
  "NFL on Fox", 
  "MLB on Fox",
  "NASCAR Race Hub",
  "NBA on TNT",
  "FOX News",
  "NBC Nightly News", 
  "CBS Evening News",
  "PBS NewsHour",
  "ABC World News Tonight",
  "Good Morning America",
  "Skip and Shannon: Undisputed",
  "CMT Music Videos",
  "Christmas Movies", // Generic category
]);