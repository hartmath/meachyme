import { useState, useEffect } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AddGroupMembersProps {
  groupId: string;
  currentMembers: string[]; // Array of user IDs who are already members
  onClose: () => void;
}

export function AddGroupMembers({ groupId, currentMembers, onClose }: AddGroupMembersProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Fetch all available users to add to groups
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['all-users-for-groups'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get all user profiles (excluding current user)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, user_type')
        .neq('id', user.id)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

      return profiles || [];
    }
  });

  // Filter contacts based on search term and exclude current members
  const filteredContacts = contacts?.filter(contact => {
    const isNotMember = !currentMembers.includes(contact.id);
    const matchesSearch = contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.user_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Debug logging
    if (!isNotMember) {
      console.log('Filtering out existing member:', contact.id, contact.full_name);
    }
    
    return isNotMember && matchesSearch;
  }) || [];

  // Debug logging
  console.log('Current members:', currentMembers);
  console.log('Available contacts:', contacts?.length);
  console.log('Filtered contacts:', filteredContacts.length);

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (!groupId || userIds.length === 0) throw new Error('Invalid data');

      console.log('Adding members:', { groupId, userIds });

      // Check for duplicates before attempting to add
      const duplicateUsers = userIds.filter(userId => currentMembers.includes(userId));
      if (duplicateUsers.length > 0) {
        console.error('Attempting to add duplicate members:', duplicateUsers);
        throw new Error(`Cannot add members who are already in the group: ${duplicateUsers.join(', ')}`);
      }

      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);

      // Test helper functions
      try {
        const { data: isCreator } = await supabase.rpc('is_group_creator', { p_group_id: groupId });
        const { data: isMember } = await supabase.rpc('is_group_member', { p_group_id: groupId });
        const { data: isAdmin } = await supabase.rpc('is_group_admin', { p_group_id: groupId });
        console.log('Helper function results:', { isCreator, isMember, isAdmin });
      } catch (helperError) {
        console.error('Helper function error:', helperError);
      }

      const { data, error } = await supabase
        .from('group_members')
        .insert(
          userIds.map(userId => ({
            group_id: groupId,
            user_id: userId,
            role: 'member'
          }))
        )
        .select();

      console.log('Add members result:', { data, error });

      if (error) {
        console.error('Detailed error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast({
        title: "Members added",
        description: `${selectedUsers.length} member(s) added to the group.`,
      });
      onClose();
    },
    onError: (error) => {
      console.error('Add members error:', error);
      toast({
        title: "Failed to add members",
        description: error.message || 'An unexpected error occurred',
        variant: "destructive"
      });
    }
  });

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = () => {
    if (selectedUsers.length > 0) {
      addMembersMutation.mutate(selectedUsers);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Add Members</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading users...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'No users found matching your search.' : 'No users available to add.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUsers.includes(contact.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleUserSelect(contact.id)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.avatar_url} alt={contact.full_name} />
                    <AvatarFallback>{getInitials(contact.full_name || 'User')}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {contact.full_name || 'Unknown User'}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {contact.user_type?.replace('_', ' ') || 'User'}
                      </Badge>
                    </div>
                  </div>

                  {selectedUsers.includes(contact.id) && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedUsers.length} selected
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddMembers}
                disabled={selectedUsers.length === 0 || addMembersMutation.isPending}
              >
                {addMembersMutation.isPending ? 'Adding...' : `Add ${selectedUsers.length} Member(s)`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
