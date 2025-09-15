import { BarChart3, ExternalLink, Search, Plus, Calendar, MapPin, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SearchModal } from "@/components/SearchModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/Loading";

export default function Events() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch user's events
  const { data: events, isLoading } = useQuery({
    queryKey: ['user-events'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return events;
    }
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleEventAnalytics = (eventId: string) => {
    // TODO: Navigate to MEA
    console.log("Opening MEA for event:", eventId);
    // This would navigate to the MEA system
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="flex items-center justify-between p-3 border-b border-border">
        <h1 className="text-lg font-bold">Events</h1>
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

      {/* Events List */}
      <div className="p-3">
        {isLoading ? (
          <Loading className="p-8" text="Loading events..." />
        ) : events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Event Image */}
                {event.image_url && (
                  <div className="aspect-video relative">
                    <img 
                      src={event.image_url} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                      {event.published ? 'Published' : 'Draft'}
                    </div>
                  </div>
                )}
                
                {/* Event Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1 truncate">{event.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description || 'No description provided'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEventAnalytics(event.id)}
                      className="ml-3 h-7 px-2 text-xs flex-shrink-0"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Analytics
                    </Button>
                  </div>
                  
                  {/* Event Meta */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{formatDate(event.date)}</span>
                      {event.time && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{formatTime(event.time)}</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    
                    {event.max_attendees && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="h-4 w-4 mr-2" />
                        <span>Max {event.max_attendees} attendees</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Category Badge */}
                  {event.category && (
                    <div className="mt-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {event.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No events yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first event to get started with event management.
            </p>
            <Button onClick={() => navigate("/create-event")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        )}
      </div>

      {/* MEA Integration Section */}
      <div className="px-3 mt-6">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-lg">
                <img 
                  src="/mea-logo.jpg" 
                  alt="MEA Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">MEA Analytics</h3>
                <p className="text-xs text-muted-foreground">
                  Access advanced event analytics and insights
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleEventAnalytics('mea')}
              className="h-8 px-3 text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open MEA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}