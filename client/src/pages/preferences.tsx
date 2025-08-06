import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";

interface UserPreferences {
  id?: string;
  userId: string;
  preferredGenres: string[];
  preferredContentTypes: string[];
  preferredSports: string[];
  favoriteTeams: Record<string, string[]>;
  interests: string[];
  contentRatings: string[];
  preferredLanguages: string[];
  autoAddLikedContent: boolean;
}

const GENRE_OPTIONS = [
  { id: 'action', label: 'Action & Adventure' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'drama', label: 'Drama' },
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'horror', label: 'Horror' },
  { id: 'romance', label: 'Romance' },
  { id: 'sci-fi', label: 'Science Fiction' },
  { id: 'thriller', label: 'Thriller' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'reality', label: 'Reality TV' },
  { id: 'sitcom', label: 'Sitcom' },
  { id: 'news', label: 'News' },
  { id: 'sports', label: 'Sports' },
  { id: 'kids', label: 'Kids & Family' },
  { id: 'anime', label: 'Anime' },
];

const CONTENT_TYPE_OPTIONS = [
  { id: 'movie', label: 'Movies' },
  { id: 'show', label: 'TV Shows' },
  { id: 'music', label: 'Music' },
  { id: 'live', label: 'Live TV' },
  { id: 'sports', label: 'Sports' },
];

const SPORTS_OPTIONS = [
  { id: 'nfl', label: 'NFL (Football)' },
  { id: 'nba', label: 'NBA (Basketball)' },
  { id: 'mlb', label: 'MLB (Baseball)' },
  { id: 'nhl', label: 'NHL (Hockey)' },
  { id: 'soccer', label: 'Soccer' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'golf', label: 'Golf' },
  { id: 'mma', label: 'MMA/UFC' },
  { id: 'boxing', label: 'Boxing' },
  { id: 'racing', label: 'Auto Racing' },
];

const TEAM_OPTIONS = {
  nfl: ['Patriots', 'Cowboys', 'Packers', 'Steelers', 'Giants', 'Eagles', 'Chiefs', '49ers', 'Raiders', 'Broncos'],
  nba: ['Lakers', 'Warriors', 'Celtics', 'Bulls', 'Heat', 'Knicks', 'Nets', 'Clippers', 'Mavericks', 'Spurs'],
  mlb: ['Yankees', 'Red Sox', 'Dodgers', 'Giants', 'Cubs', 'Cardinals', 'Mets', 'Phillies', 'Astros', 'Braves'],
  nhl: ['Bruins', 'Rangers', 'Kings', 'Blackhawks', 'Penguins', 'Red Wings', 'Canadiens', 'Maple Leafs', 'Flyers', 'Devils'],
};

const INTEREST_OPTIONS = [
  { id: 'finance', label: 'Finance & Business' },
  { id: 'politics', label: 'Politics' },
  { id: 'technology', label: 'Technology' },
  { id: 'health', label: 'Health & Wellness' },
  { id: 'food', label: 'Food & Cooking' },
  { id: 'travel', label: 'Travel' },
  { id: 'fashion', label: 'Fashion & Style' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'music-culture', label: 'Music & Culture' },
  { id: 'science', label: 'Science & Nature' },
];

const RATING_OPTIONS = [
  { id: 'G', label: 'G - General Audiences' },
  { id: 'PG', label: 'PG - Parental Guidance' },
  { id: 'PG-13', label: 'PG-13 - Parents Strongly Cautioned' },
  { id: 'R', label: 'R - Restricted' },
  { id: 'TV-Y', label: 'TV-Y - All Children' },
  { id: 'TV-Y7', label: 'TV-Y7 - Children 7+' },
  { id: 'TV-G', label: 'TV-G - General Audience' },
  { id: 'TV-PG', label: 'TV-PG - Parental Guidance' },
  { id: 'TV-14', label: 'TV-14 - Parents Strongly Cautioned' },
  { id: 'TV-MA', label: 'TV-MA - Mature Audiences' },
];

export default function PreferencesPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [preferences, setPreferences] = useState<UserPreferences>({
    userId: '',
    preferredGenres: [],
    preferredContentTypes: [],
    preferredSports: [],
    favoriteTeams: {},
    interests: [],
    contentRatings: [],
    preferredLanguages: ['en'],
    autoAddLikedContent: true,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  // Fetch user preferences
  const { data: userPrefs, isLoading } = useQuery({
    queryKey: ['/api/user/preferences'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Update local state when data loads
  useEffect(() => {
    if (userPrefs) {
      setPreferences(prev => ({ ...prev, ...userPrefs }));
    }
  }, [userPrefs]);

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (data: UserPreferences) => {
      return apiRequest('/api/user/preferences', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Preferences saved",
        description: "Your content preferences have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/recommendations'] });
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
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTogglePreference = (category: keyof UserPreferences, value: string) => {
    setPreferences(prev => {
      const currentValues = prev[category] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return {
        ...prev,
        [category]: newValues
      };
    });
  };

  const handleToggleTeam = (sport: string, team: string) => {
    setPreferences(prev => {
      const currentTeams = prev.favoriteTeams[sport] || [];
      const newTeams = currentTeams.includes(team)
        ? currentTeams.filter(t => t !== team)
        : [...currentTeams, team];
      
      return {
        ...prev,
        favoriteTeams: {
          ...prev.favoriteTeams,
          [sport]: newTeams
        }
      };
    });
  };

  const handleSave = () => {
    savePreferencesMutation.mutate(preferences);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-navy p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-cream">Loading preferences...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cream mb-2" data-testid="text-page-title">
            My Content Preferences
          </h1>
          <p className="text-gray-400" data-testid="text-page-description">
            Tell us what you like so we can recommend better content for you
          </p>
        </div>

        {/* Content Types */}
        <Card className="bg-navy-lighter border-navy-lighter">
          <CardHeader>
            <CardTitle className="text-cream">Content Types</CardTitle>
            <CardDescription className="text-gray-400">
              What types of content do you enjoy?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CONTENT_TYPE_OPTIONS.map(option => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${option.id}`}
                    checked={preferences.preferredContentTypes.includes(option.id)}
                    onCheckedChange={() => handleTogglePreference('preferredContentTypes', option.id)}
                    data-testid={`checkbox-content-type-${option.id}`}
                  />
                  <Label htmlFor={`type-${option.id}`} className="text-cream text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Genres */}
        <Card className="bg-navy-lighter border-navy-lighter">
          <CardHeader>
            <CardTitle className="text-cream">Favorite Genres</CardTitle>
            <CardDescription className="text-gray-400">
              Select the genres you enjoy most
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {GENRE_OPTIONS.map(genre => (
                <div key={genre.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`genre-${genre.id}`}
                    checked={preferences.preferredGenres.includes(genre.id)}
                    onCheckedChange={() => handleTogglePreference('preferredGenres', genre.id)}
                    data-testid={`checkbox-genre-${genre.id}`}
                  />
                  <Label htmlFor={`genre-${genre.id}`} className="text-cream text-sm">
                    {genre.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sports */}
        <Card className="bg-navy-lighter border-navy-lighter">
          <CardHeader>
            <CardTitle className="text-cream">Sports Interests</CardTitle>
            <CardDescription className="text-gray-400">
              Which sports do you follow?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {SPORTS_OPTIONS.map(sport => (
                <div key={sport.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`sport-${sport.id}`}
                    checked={preferences.preferredSports.includes(sport.id)}
                    onCheckedChange={() => handleTogglePreference('preferredSports', sport.id)}
                    data-testid={`checkbox-sport-${sport.id}`}
                  />
                  <Label htmlFor={`sport-${sport.id}`} className="text-cream text-sm">
                    {sport.label}
                  </Label>
                </div>
              ))}
            </div>

            {/* Favorite Teams */}
            {preferences.preferredSports.length > 0 && (
              <div className="space-y-4">
                <Separator className="bg-navy" />
                <h3 className="text-cream font-medium">Favorite Teams</h3>
                {preferences.preferredSports.map(sport => (
                  TEAM_OPTIONS[sport as keyof typeof TEAM_OPTIONS] && (
                    <div key={sport} className="space-y-2">
                      <Label className="text-cream text-sm font-medium">
                        {SPORTS_OPTIONS.find(s => s.id === sport)?.label}
                      </Label>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {TEAM_OPTIONS[sport as keyof typeof TEAM_OPTIONS].map(team => (
                          <Badge
                            key={team}
                            variant={preferences.favoriteTeams[sport]?.includes(team) ? "default" : "outline"}
                            className={`cursor-pointer text-xs ${
                              preferences.favoriteTeams[sport]?.includes(team)
                                ? 'bg-blue-gradient text-white'
                                : 'border-gray-500 text-gray-400 hover:text-cream'
                            }`}
                            onClick={() => handleToggleTeam(sport, team)}
                            data-testid={`badge-team-${sport}-${team.toLowerCase()}`}
                          >
                            {team}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interests */}
        <Card className="bg-navy-lighter border-navy-lighter">
          <CardHeader>
            <CardTitle className="text-cream">Other Interests</CardTitle>
            <CardDescription className="text-gray-400">
              What topics are you interested in?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {INTEREST_OPTIONS.map(interest => (
                <div key={interest.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`interest-${interest.id}`}
                    checked={preferences.interests.includes(interest.id)}
                    onCheckedChange={() => handleTogglePreference('interests', interest.id)}
                    data-testid={`checkbox-interest-${interest.id}`}
                  />
                  <Label htmlFor={`interest-${interest.id}`} className="text-cream text-sm">
                    {interest.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Ratings */}
        <Card className="bg-navy-lighter border-navy-lighter">
          <CardHeader>
            <CardTitle className="text-cream">Content Ratings</CardTitle>
            <CardDescription className="text-gray-400">
              Which content ratings are appropriate for you?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RATING_OPTIONS.map(rating => (
                <div key={rating.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`rating-${rating.id}`}
                    checked={preferences.contentRatings.includes(rating.id)}
                    onCheckedChange={() => handleTogglePreference('contentRatings', rating.id)}
                    data-testid={`checkbox-rating-${rating.id}`}
                  />
                  <Label htmlFor={`rating-${rating.id}`} className="text-cream text-sm">
                    {rating.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Auto-add Settings */}
        <Card className="bg-navy-lighter border-navy-lighter">
          <CardHeader>
            <CardTitle className="text-cream">Smart Recommendations</CardTitle>
            <CardDescription className="text-gray-400">
              Automatically improve recommendations based on your activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-add"
                checked={preferences.autoAddLikedContent}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, autoAddLikedContent: checked }))
                }
                data-testid="switch-auto-add"
              />
              <Label htmlFor="auto-add" className="text-cream">
                Automatically learn from content I like and watch
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-center pt-6">
          <Button
            onClick={handleSave}
            disabled={savePreferencesMutation.isPending}
            className="bg-blue-gradient hover:bg-blue-gradient/90 text-white px-8 py-2"
            data-testid="button-save-preferences"
          >
            {savePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}