import { ArrowLeft, MoreVertical, Phone, Video, UserPlus, Flag, Volume, VolumeX } from "lucide-react";
// import { MeetingButton } from "./MeetingButton";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface ChatPartner {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  is_online: boolean | null;
  last_seen: string | null;
}

interface ChatHeaderProps {
  chatPartner: ChatPartner;
  onBackClick: () => void;
  onMenuAction?: (action: 'voice' | 'video' | 'mute' | 'block' | 'report') => void;
}

export function ChatHeader({ 
  chatPartner, 
  onBackClick, 
  onMenuAction
}: ChatHeaderProps) {
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBackClick}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {/* Profile Section */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
              {chatPartner.avatar_url ? (
                <img 
                  src={chatPartner.avatar_url} 
                  alt={chatPartner.full_name || 'User'} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(chatPartner.full_name || 'User')
              )}
            </div>
            {/* Online indicator */}
            {chatPartner.is_online && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-base leading-tight">
              {chatPartner.full_name || 'Unknown User'}
            </h3>
            <div className="text-xs text-muted-foreground">
              <span className="text-primary font-medium capitalize">
                {chatPartner.user_type?.replace('_', ' ') || 'User'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Button */}
      {/* <MeetingButton 
        chatId={chatPartner.user_id}
        chatType="direct"
        chatName={chatPartner.full_name || 'User'}
        variant="ghost"
        size="sm"
      /> */}

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover border border-border shadow-lg z-50">
          <DropdownMenuItem 
            onClick={() => onMenuAction?.('voice')}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <Phone className="h-4 w-4" />
            <span>Voice Call</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onMenuAction?.('video')}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <Video className="h-4 w-4" />
            <span>Video Call</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => onMenuAction?.('mute')}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <VolumeX className="h-4 w-4" />
            <span>Mute Notifications</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onMenuAction?.('block')}
            className="flex items-center space-x-2 cursor-pointer text-destructive"
          >
            <UserPlus className="h-4 w-4" />
            <span>Block User</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onMenuAction?.('report')}
            className="flex items-center space-x-2 cursor-pointer text-destructive"
          >
            <Flag className="h-4 w-4" />
            <span>Report User</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}