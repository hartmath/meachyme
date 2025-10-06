import { ExternalLink, Search, Calendar, Plus, Link, Share2, Clock, MapPin, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { SearchModal } from "@/components/SearchModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loading } from "@/components/Loading";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AuthStatus } from "@/components/AuthStatus";
import { NavigationTest } from "@/components/NavigationTest";

export default function Events() {
  const { user } = useAuth();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPostingEvent, setIsPostingEvent] = useState(false);
  const [eventType, setEventType] = useState<'shared_link' | 'created_event'>('shared_link');
  const [eventLink, setEventLink] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventCategory, setEventCategory] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch shared event links
  const { data: eventLinks, isLoading, error: queryError } = useQuery({
    queryKey: ['shared-event-links'],
    enabled: !!user, // Only run if user is authenticated
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Not authenticated",
            description: "Please sign in to view events.",
            variant: "destructive",
          });
          navigate("/auth");
          return [];
        }

        const { data: linksData, error } = await supabase
          .from('event_links_with_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        // Transform the data to match the expected format
        const links = linksData?.map(link => ({
          ...link,
          profiles: link.profile_data
        }));

        return links || [];
      } catch (error) {
        console.error('Error in event links query:', error);
        toast({
          title: "Error",
          description: "Failed to load events. Please try again.",
          variant: "destructive",
        });
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Post event mutation
  const postEventMutation = useMutation({
    mutationFn: async ({ 
      type, 
      link, 
      title, 
      description, 
      date, 
      time, 
      location, 
      category, 
      maxAttendees 
    }: { 
      type: 'shared_link' | 'created_event';
      link?: string; 
      title: string; 
      description: string;
      date?: string;
      time?: string;
      location?: string;
      category?: string;
      maxAttendees?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const eventData: any = {
        user_id: user.id,
        event_type: type,
        title: title,
        description: description
      };

      if (type === 'shared_link' && link) {
        eventData.event_link = link;
      } else if (type === 'created_event') {
        if (date && time) {
          eventData.event_date = new Date(`${date}T${time}`).toISOString();
        }
        if (location) eventData.event_location = location;
        if (category) eventData.event_category = category;
        if (maxAttendees) eventData.max_attendees = maxAttendees;
      }

      const { data, error } = await supabase
        .from('shared_event_links')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-event-links'] });
      // Reset all form fields
      setEventLink("");
      setEventTitle("");
      setEventDescription("");
      setEventDate("");
      setEventTime("");
      setEventLocation("");
      setEventCategory("");
      setMaxAttendees("");
      setIsPostingEvent(false);
      toast({
        title: "Event posted!",
        description: eventType === 'shared_link' 
          ? "Your event link has been shared successfully." 
          : "Your event has been created successfully.",
      });
    },
    onError: (error) => {
      console.error('Event posting error:', error);
      toast({
        title: "Error",
        description: `Failed to post event: ${error.message}. The events table may not be set up yet.`,
        variant: "destructive",
      });
    }
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handlePostEvent = () => {
    if (!eventTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide an event title.",
        variant: "destructive",
      });
      return;
    }

    if (eventType === 'shared_link' && !eventLink.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide an event link.",
        variant: "destructive",
      });
      return;
    }

    if (eventType === 'created_event' && (!eventDate || !eventTime)) {
      toast({
        title: "Missing information",
        description: "Please provide event date and time.",
        variant: "destructive",
      });
      return;
    }

    postEventMutation.mutate({
      type: eventType,
      link: eventLink.trim(),
      title: eventTitle.trim(),
      description: eventDescription.trim(),
      date: eventDate,
      time: eventTime,
      location: eventLocation.trim(),
      category: eventCategory,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined
    });
  };

  const handleOpenEventLink = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="flex items-center justify-between p-3 border-b border-border">
        <h1 className="text-lg font-bold">Event Links</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchModalOpen(true)}
            className="h-8 w-8"
          >
            <Search className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <SearchModal open={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />

      {/* Post Event Section */}
      <div className="p-3 border-b border-border">
        <Button
          onClick={() => setIsPostingEvent(!isPostingEvent)}
          className="w-full justify-start"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Post Event
        </Button>

        {isPostingEvent && (
          <div className="mt-4 space-y-3 p-4 bg-muted/50 rounded-lg">
            {/* Event Type Selection */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Event Type *
              </label>
              <Select value={eventType} onValueChange={(value: 'shared_link' | 'created_event') => setEventType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared_link">Share External Event Link</SelectItem>
                  <SelectItem value="created_event">Create New Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Event Link (only for shared_link type) */}
            {eventType === 'shared_link' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Event Link *
                </label>
                <Input
                  placeholder="https://example.com/event"
                  value={eventLink}
                  onChange={(e) => setEventLink(e.target.value)}
                  className="w-full"
                />
              </div>
            )}

            {/* Event Title */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Event Title *
              </label>
              <Input
                placeholder="Enter event title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Event Description */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Description (Optional)
              </label>
              <Textarea
                placeholder="Describe the event..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className="w-full"
                rows={3}
              />
            </div>

            {/* Event Details (only for created_event type) */}
            {eventType === 'created_event' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Event Date *
                    </label>
                    <Input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Event Time *
                    </label>
                    <Input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Location (Optional)
                  </label>
                  <Input
                    placeholder="Event location or venue"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Category (Optional)
                    </label>
                    <Select value={eventCategory} onValueChange={setEventCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Max Attendees (Optional)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 50"
                      value={maxAttendees}
                      onChange={(e) => setMaxAttendees(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={handlePostEvent}
                disabled={postEventMutation.isPending}
                className="flex-1 relative"
              >
                {postEventMutation.isPending ? (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    </div>
                    <span className="opacity-0">Post Event</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Post Event
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsPostingEvent(false);
                  setEventLink("");
                  setEventTitle("");
                  setEventDescription("");
                  setEventDate("");
                  setEventTime("");
                  setEventLocation("");
                  setEventCategory("");
                  setMaxAttendees("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Shared Event Links */}
      <div className="p-3">
        {isLoading ? (
          <Loading className="p-8" text="Loading event links..." />
        ) : queryError ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Error loading events</h3>
            <p className="text-muted-foreground text-center mb-4">
              There was a problem loading the events. Please try again.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Retry
            </Button>
          </div>
        ) : queryError ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-orange-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Events table not set up</h3>
            <p className="text-muted-foreground text-center mb-4">
              The events functionality requires a database table to be created. Please contact the administrator to set up the events table.
            </p>
            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-2">To fix this:</p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>Run the migration: <code className="bg-background px-1 rounded">supabase/migrations/20250115000002_create_shared_event_links.sql</code></li>
                <li>Or create the table manually in your Supabase dashboard</li>
              </ol>
            </div>
          </div>
        ) : eventLinks && eventLinks.length > 0 ? (
          <div className="space-y-3">
            {eventLinks.map((eventLink) => (
              <div key={eventLink.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {eventLink.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        eventLink.event_type === 'created_event' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {eventLink.event_type === 'created_event' ? 'Created Event' : 'External Link'}
                      </span>
                    </div>
                    {eventLink.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {eventLink.description}
                      </p>
                    )}
                    
                    {/* Event Details */}
                    <div className="space-y-1 mb-2">
                      {eventLink.event_date && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          <span>{formatDate(eventLink.event_date)} at {formatTime(eventLink.event_date)}</span>
                        </div>
                      )}
                      {eventLink.event_location && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>{eventLink.event_location}</span>
                        </div>
                      )}
                      {eventLink.event_category && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            {eventLink.event_category}
                          </span>
                        </div>
                      )}
                      {eventLink.max_attendees && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Users className="h-3 w-3 mr-1" />
                          <span>Max {eventLink.max_attendees} attendees</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Posted {formatDate(eventLink.created_at)} at {formatTime(eventLink.created_at)}</span>
                    </div>
                  </div>
                  
                  {eventLink.event_link && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEventLink(eventLink.event_link)}
                      className="ml-3 h-8 px-3 text-xs flex-shrink-0"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  )}
                </div>

                {/* Event Link Preview (only for shared links) */}
                {eventLink.event_link && (
                  <div className="bg-muted/30 rounded p-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <Link className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground truncate">
                        {eventLink.event_link}
                      </span>
                    </div>
                  </div>
                )}

                {/* Posted by */}
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {eventLink.profiles?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {eventLink.event_type === 'created_event' ? 'Created by' : 'Shared by'} {eventLink.profiles?.full_name || 'Unknown'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No event links yet</h3>
            <p className="text-muted-foreground text-center">
              Share event links to help others discover great events.
            </p>
          </div>
        )}
        
        {/* Debug Components - Remove in production */}
        <div className="mt-8 space-y-4">
          <AuthStatus />
          <NavigationTest />
        </div>
      </div>
    </div>
  );
}