import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/Loading";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CalendarDays, Clock, MapPin, Users, Link as LinkIcon } from "lucide-react";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["event-details", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_links_with_profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const normalizeExternalUrl = (input: string) => {
    const trimmed = (input || "").trim();
    const noSpaces = trimmed.replace(/\s+/g, "");
    if (/^https?:\/\//i.test(noSpaces)) return noSpaces;
    if (/^www\./i.test(noSpaces)) return `https://${noSpaces}`;
    return `https://${noSpaces}`;
  };

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

  if (isLoading) {
    return <Loading className="p-8" text="Loading event..." />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Event not found.</p>
          </Card>
        </div>
      </div>
    );
  }

  const event = {
    ...data,
    profiles: (data as any).profile_data,
  } as any;

  // If this event has an external link, redirect to it
  useEffect(() => {
    if (event?.event_link) {
      const url = normalizeExternalUrl(event.event_link);
      window.location.replace(url);
    }
  }, [event?.event_link]);

  if (event.event_link) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-xl mx-auto">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Redirecting to event...</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <Card className="p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl font-semibold">{event.title}</h1>
              <span className={`px-2 py-1 text-xs rounded-full ${
                event.event_type === 'created_event'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {event.event_type === 'created_event' ? 'Created Event' : 'External Link'}
              </span>
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}
          </div>

          {event.event_link && (
            <div className="bg-muted/30 rounded p-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <a href={normalizeExternalUrl(event.event_link)} target="_blank" rel="noreferrer noopener" className="text-sm underline">
                  {normalizeExternalUrl(event.event_link)}
                </a>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {event.event_date && (
              <div className="flex items-center text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 mr-2" />
                <span>{formatDate(event.event_date)} at {formatTime(event.event_date)}</span>
              </div>
            )}
            {event.event_location && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{event.event_location}</span>
              </div>
            )}
            {event.max_attendees && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-2" />
                <span>Max {event.max_attendees} attendees</span>
              </div>
            )}
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            Posted by {event.profiles?.full_name || 'Unknown'} • {formatDate(event.created_at)} {formatTime(event.created_at)}
          </div>
        </Card>
      </div>
    </div>
  );
}


