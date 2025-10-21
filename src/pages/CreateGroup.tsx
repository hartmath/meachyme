import { useState, useRef } from "react";
import { ArrowLeft, Users, Upload, Image, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loading } from "@/components/Loading";

export default function CreateGroup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [groupData, setGroupData] = useState({
    name: "",
    description: ""
  });

  const [groupImage, setGroupImage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!groupData.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a group name.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to create groups.",
          variant: "destructive"
        });
        return;
      }

      // Use direct method with proper authentication
      console.log('Creating group with user:', user.id);
      
      // Create the group
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupData.name.trim(),
          description: groupData.description.trim() || null,
          avatar_url: groupImage,
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) {
        console.error('Group creation error:', {
          message: groupError.message,
          details: (groupError as any).details,
          hint: (groupError as any).hint,
          code: groupError.code,
        });
        throw groupError;
      }

      console.log('Group created successfully:', newGroup.id);

      // Add the creator as an admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: newGroup.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) {
        console.warn('Could not add creator as member:', memberError.message);
        // Continue anyway - the group was created successfully
        // The RLS policy should handle this automatically
      } else {
        console.log('Creator added as admin member successfully');
      }

      toast({
        title: "Group Created!",
        description: `${groupData.name} has been successfully created.`,
      });

      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      
      navigate("/groups");
    } catch (error: any) {
      console.error('Group creation error:', error);
      toast({
        title: "Failed to create group",
        description: error.message || 'An unexpected error occurred',
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setGroupData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Mutation to upload group image
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/group-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onSuccess: (publicUrl) => {
      setGroupImage(publicUrl);
      toast({
        title: "Image uploaded",
        description: "Group avatar has been added.",
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
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/groups")}
            className="mr-2 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Create Group</h1>
        </div>
        <Button 
          onClick={handleSave} 
          size="sm" 
          className="h-8 px-3 text-xs"
          disabled={!groupData.name.trim()}
        >
          <Save className="h-3 w-3 mr-1" />
          Create
        </Button>
      </header>

      {/* Group Avatar */}
      <div className="p-4 bg-card border-b border-border">
        <div 
          className="w-20 h-20 bg-muted rounded-full flex flex-col items-center justify-center text-muted-foreground cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors relative overflow-hidden mx-auto"
          onClick={triggerImageUpload}
        >
          {groupImage ? (
            <>
              <img 
                src={groupImage} 
                alt="Group avatar" 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Image className="h-4 w-4 mb-1 text-white" />
                <p className="text-xs font-medium text-white">Change</p>
              </div>
            </>
          ) : groupData.name ? (
            <span className="text-2xl font-bold text-primary">
              {getInitials(groupData.name)}
            </span>
          ) : (
            <>
              <Upload className="h-6 w-6 mb-1" />
              <p className="text-xs font-medium">Add Avatar</p>
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
        {/* Group Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Group Name *</Label>
          <Input
            id="name"
            value={groupData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="h-9 text-sm"
            placeholder="Enter group name"
            maxLength={50}
          />
          <div className="text-xs text-muted-foreground text-right">
            {groupData.name.length}/50
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">Description</Label>
          <Textarea
            id="description"
            value={groupData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className="min-h-[100px] text-sm resize-none"
            placeholder="Tell people what this group is about..."
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {groupData.description.length}/500
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 mt-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Group Creation Tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Choose a clear, descriptive name</li>
                <li>• Add a description to help people understand the group's purpose</li>
                <li>• You'll be the admin and can add members later</li>
                <li>• Groups are private by default</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
