import { useState, useRef } from "react";
import { ArrowLeft, Calendar, MapPin, Users, Clock, Save, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";

export default function CreateEvent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    capacity: "",
    category: "",
    isPublic: true
  });

  const [eventImage, setEventImage] = useState<string | null>(null);

  const categories = [
    "Conference",
    "Workshop", 
    "Networking",
    "Wedding",
    "Corporate",
    "Festival",
    "Exhibition",
    "Other"
  ];

  const handleSave = async () => {
    if (!eventData.title || !eventData.date || !eventData.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to create events.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          title: eventData.title,
          description: eventData.description,
          date: eventData.date,
          time: eventData.time,
          location: eventData.location,
          max_attendees: eventData.capacity ? parseInt(eventData.capacity) : null,
          category: eventData.category,
          published: eventData.isPublic,
          image_url: eventImage,
          is_free: true // Default to free for now
        });

      if (error) throw error;

      toast({
        title: "Event Created!",
        description: `${eventData.title} has been successfully created.`,
      });
      
      navigate("/events");
    } catch (error: any) {
      toast({
        title: "Failed to create event",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEventData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Mutation to upload event image
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/event-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onSuccess: (publicUrl) => {
      setEventImage(publicUrl);
      toast({
        title: "Image uploaded",
        description: "Event cover image has been added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive"
        });
        return;
      }

      uploadImageMutation.mutate(file);
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/events")}
            className="mr-2 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Create Event</h1>
        </div>
        <Button onClick={handleSave} size="sm" className="h-8 px-3 text-xs">
          <Save className="h-3 w-3 mr-1" />
          Create
        </Button>
      </header>

      {/* Event Image */}
      <div className="p-4 bg-card border-b border-border">
        <div 
          className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors relative overflow-hidden"
          onClick={triggerImageUpload}
        >
          {eventImage ? (
            <>
              <img 
                src={eventImage} 
                alt="Event cover" 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Image className="h-6 w-6 mb-2 text-white" />
                <p className="text-sm font-medium text-white">Change Image</p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 mb-2" />
              <p className="text-sm font-medium">Add Event Cover</p>
              <p className="text-xs">Upload an image to showcase your event</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        {uploadImageMutation.isPending && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Uploading image...
          </div>
        )}
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">Event Title *</Label>
          <Input
            id="title"
            value={eventData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            className="h-9 text-sm"
            placeholder="Enter event title"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-medium">Category</Label>
          <Select value={eventData.category} onValueChange={(value) => handleInputChange("category", value)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select event category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
              <Input
                id="date"
                type="date"
                value={eventData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className="h-9 text-sm pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="time" className="text-sm font-medium">Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
              <Input
                id="time"
                type="time"
                value={eventData.time}
                onChange={(e) => handleInputChange("time", e.target.value)}
                className="h-9 text-sm pl-9"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium">Location *</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
            <Input
              id="location"
              value={eventData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              className="h-9 text-sm pl-9"
              placeholder="Enter venue address"
            />
          </div>
        </div>

        {/* Capacity */}
        <div className="space-y-2">
          <Label htmlFor="capacity" className="text-sm font-medium">Capacity</Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
            <Input
              id="capacity"
              type="number"
              value={eventData.capacity}
              onChange={(e) => handleInputChange("capacity", e.target.value)}
              className="h-9 text-sm pl-9"
              placeholder="Maximum attendees"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">Description</Label>
          <Textarea
            id="description"
            value={eventData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className="min-h-[100px] text-sm resize-none"
            placeholder="Tell people what this event is about..."
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {eventData.description.length}/500
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 mt-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            * Required fields. Your event will be visible to other MEA Chyme users once created.
          </p>
        </div>
      </div>
    </div>
  );
}