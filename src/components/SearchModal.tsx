import { useState, useEffect } from "react";
import { Search, X, MessageCircle, Calendar, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  type: "contact" | "event" | "message" | "group";
  title: string;
  subtitle: string;
  avatar?: string;
  path: string;
}

const mockSearchResults: SearchResult[] = [
  {
    id: "1",
    type: "contact",
    title: "Sarah Chen",
    subtitle: "Event Organizer • San Francisco",
    avatar: "SC",
    path: "/chat/1"
  },
  {
    id: "2", 
    type: "event",
    title: "Tech Conference 2024",
    subtitle: "Tomorrow • Moscone Center",
    path: "/events"
  },
  {
    id: "3",
    type: "message",
    title: "venue setup going well",
    subtitle: "From Sarah Chen • 2 hours ago",
    path: "/chat/1"
  },
  {
    id: "4",
    type: "group",
    title: "Event Coordinators",
    subtitle: "12 members • Active now",
    avatar: "EC",
    path: "/chat/group-1"
  }
];

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Mock search - in real app, this would be an API call
    const filtered = mockSearchResults.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    onClose();
    setQuery("");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "contact": return Users;
      case "event": return Calendar;
      case "message": return MessageCircle;
      case "group": return Users;
      default: return Search;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-lg font-semibold">Search</DialogTitle>
        </DialogHeader>
        
        <div className="p-4 pt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search contacts, events, messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-10"
              autoFocus
            />
          </div>
        </div>

        {results.length > 0 && (
          <div className="max-h-96 overflow-y-auto">
            {results.map((result) => {
              const Icon = getIcon(result.type);
              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center p-4 hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {result.avatar ? (
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                        {result.avatar}
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="p-8 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No results found for "{query}"</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}