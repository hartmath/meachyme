import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/Loading";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CalendarDays, Clock, MapPin, Users, Link as LinkIcon } from "lucide-react";

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  event_type: 'shared_link' | 'created_event';
  event_link?: string | null;
  event_date?: string | null;
  event_location?: string | null;
  event_category?: string | null;
  max_attendees?: number | null;
  created_at: string;
  image_url?: string | null;
  profile_data?: { full_name?: string | null } | null;
};

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<EventRow | null>({
    queryKey: ["event-details", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_links_with_profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as EventRow;
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

  // Redirect if linked event has external URL
  useEffect(() => {
    if (data?.event_link) {
      const url = normalizeExternalUrl(data.event_link);
      window.location.replace(url);
    }
  }, [data?.event_link]);

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

  if (data.event_link) {
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
          {data.image_url && (
            <img
              src={data.image_url}
              alt={data.title}
              className="w-full rounded-md object-cover max-h-72"
              loading="lazy"
            />
          )}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl font-semibold">{data.title}</h1>
              <span className={`px-2 py-1 text-xs rounded-full ${
                data.event_type === 'created_event'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {data.event_type === 'created_event' ? 'Created Event' : 'External Link'}
              </span>
            </div>
            {data.description && (
              <p className="text-sm text-muted-foreground">{data.description}</p>
            )}
          </div>

          {data.event_link && (
            <div className="bg-muted/30 rounded p-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <a href={normalizeExternalUrl(data.event_link)} target="_blank" rel="noreferrer noopener" className="text-sm underline">
                  {normalizeExternalUrl(data.event_link)}
                </a>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {data.event_date && (
              <div className="flex items-center text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 mr-2" />
                <span>{formatDate(data.event_date)} at {formatTime(data.event_date)}</span>
              </div>
            )}
            {data.event_location && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{data.event_location}</span>
              </div>
            )}
            {data.max_attendees && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-2" />
                <span>Max {data.max_attendees} attendees</span>
              </div>
            )}
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            Posted by {data.profile_data?.full_name || 'Unknown'} • {formatDate(data.created_at)} {formatTime(data.created_at)}
          </div>
        </Card>
      </div>
    </div>
  );
}


