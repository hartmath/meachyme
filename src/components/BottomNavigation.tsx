import { MessageCircle, Home, Calendar, Phone, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";

const navItems = [
  { icon: MessageCircle, label: "Chats", path: "/chats" },
  { icon: Home, label: "Status", path: "/feed" },
  { icon: Calendar, label: "Events", path: "/events" },
  { icon: Phone, label: "Calls", path: "/calls" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNavigation() {
  const location = useLocation();
  const badgeCounts = useNotificationBadge();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          const showBadge = path === "/chats" && badgeCounts.totalUnread > 0;
          
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1 relative",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <div className="relative">
                <Icon className="h-4 w-4 mb-1" />
                {showBadge && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {badgeCounts.totalUnread > 99 ? '99+' : badgeCounts.totalUnread}
                  </div>
                )}
              </div>
              <span className="text-xs font-medium truncate">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}