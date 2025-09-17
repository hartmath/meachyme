import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Settings, UserPlus, UserMinus, Trash2, Edit, Upload, Image, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loading } from "@/components/Loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddGroupMembers } from "@/components/AddGroupMembers";

export default function GroupSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    description: ""
  });
  const [showAddMembers, setShowAddMembers] = useState(false);

  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: groupData, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return groupData;
    },
    enabled: !!id
  });

  // Fetch group members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', id],
    queryFn: async () => {
      if (!id) return [];

      const { data: membersData, error } = await supabase
        .from('group_members')
        .select(`
          id,
          role,
          joined_at,
          profiles!group_members_user_id_fkey (
            user_id,
            full_name,
            avatar_url,
            is_online
          )
        `)
        .eq('group_id', id)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return membersData;
    },
    enabled: !!id
  });

  // Get current user's role in the group
  const { data: currentUserRole } = useQuery({
    queryKey: ['user-group-role', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: memberData } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', id)
        .eq('user_id', user.id)
        .single();

      return memberData?.role || null;
    },
    enabled: !!id
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      if (!id) throw new Error('No group ID');

      const { error } = await supabase
        .from('groups')
        .update({
          name: data.name.trim(),
          description: data.description.trim() || null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      toast({
        title: "Group updated",
        description: "Group information has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update group",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!id) throw new Error('No group ID');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/group-${id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      // Update group with new avatar
      const { error: updateError } = await supabase
        .from('groups')
        .update({ avatar_url: publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      toast({
        title: "Avatar updated",
        description: "Group avatar has been updated successfully.",
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

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', id] });
      toast({
        title: "Member removed",
        description: "Member has been removed from the group.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No group ID');

      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Group deleted",
        description: "Group has been deleted successfully.",
      });
      navigate("/groups");
    },
    onError: (error) => {
      toast({
        title: "Failed to delete group",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleEdit = () => {
    if (group) {
      setEditData({
        name: group.name,
        description: group.description || ""
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (editData.name.trim()) {
      updateGroupMutation.mutate(editData);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ name: "", description: "" });
  };

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

      uploadAvatarMutation.mutate(file);
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'G';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (groupLoading || membersLoading) {
    return <Loading className="p-8" text="Loading group settings..." />;
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Group not found</h2>
          <Button onClick={() => navigate("/groups")}>
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserRole === 'admin';
  const isCreator = group.created_by === (members?.find(m => m.profiles?.user_id === group.created_by)?.profiles?.user_id);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/chat/group/${id}`)}
            className="mr-2 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Group Settings</h1>
        </div>
        {isAdmin && (
          <Button
            onClick={handleEdit}
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </header>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
          <TabsTrigger value="info">Group Info</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="px-4 mt-4">
          {/* Group Avatar */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <Avatar className="h-20 w-20 mx-auto">
                <AvatarImage src={group.avatar_url} alt={group.name} />
                <AvatarFallback className="text-2xl">{getInitials(group.name)}</AvatarFallback>
              </Avatar>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 h-6 w-6"
                  onClick={triggerImageUpload}
                >
                  <Upload className="h-3 w-3" />
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {uploadAvatarMutation.isPending && (
              <p className="text-xs text-muted-foreground mt-2">Uploading...</p>
            )}
          </div>

          {/* Group Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Group Name</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-9 text-sm"
                  maxLength={50}
                />
              ) : (
                <p className="text-sm p-2 bg-muted rounded-md">{group.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              {isEditing ? (
                <Textarea
                  id="description"
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[80px] text-sm resize-none"
                  maxLength={500}
                />
              ) : (
                <p className="text-sm p-2 bg-muted rounded-md min-h-[80px]">
                  {group.description || "No description"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-sm p-2 bg-muted rounded-md">{formatDate(group.created_at)}</p>
            </div>

            {isEditing && (
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleSave}
                  size="sm"
                  disabled={!editData.name.trim() || updateGroupMutation.isPending}
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  onClick={handleCancel}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          {isCreator && (
            <div className="mt-8 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <h3 className="font-medium text-destructive mb-2">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Once you delete a group, there is no going back. Please be certain.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete Group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the group
                      and remove all messages and members.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteGroupMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Group
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="px-4 mt-4">
          {/* Add Members Button */}
          {isAdmin && (
            <div className="mb-4">
              <Button 
                onClick={() => setShowAddMembers(true)}
                className="w-full"
                variant="outline"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Members
              </Button>
            </div>
          )}
          
          <div className="space-y-3">
            {members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profiles?.avatar_url} alt={member.profiles?.full_name} />
                    <AvatarFallback>{getInitials(member.profiles?.full_name || 'U')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm">{member.profiles?.full_name || 'Unknown User'}</p>
                      {member.role === 'admin' && (
                        <Badge variant="secondary" className="text-xs">Admin</Badge>
                      )}
                      {member.profiles?.is_online && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDate(member.joined_at)}
                    </p>
                  </div>
                </div>
                
                {isAdmin && member.role !== 'admin' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <UserMinus className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove member?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {member.profiles?.full_name} from this group?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeMemberMutation.mutate(member.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Members Modal */}
      {showAddMembers && id && (
        <AddGroupMembers
          groupId={id}
          currentMembers={members?.map(m => m.profiles?.user_id).filter(Boolean) || []}
          onClose={() => setShowAddMembers(false)}
        />
      )}
    </div>
  );
}
