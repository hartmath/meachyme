import { MessageCircle, Home, Calendar, User, Video } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: MessageCircle, label: "Chats", path: "/chats" },
  { icon: Home, label: "Status", path: "/feed" },
  { icon: Video, label: "Meet", path: "/meet" },
  { icon: Calendar, label: "Events", path: "/events" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          
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
              </div>
              <span className="text-xs font-medium truncate">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}