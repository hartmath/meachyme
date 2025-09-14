import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const navigate = useNavigate();
  const { session } = useAuth();

  // Redirect authenticated users to main app
  if (session) {
    navigate("/chats", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md">
        {/* Logo */}
        <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-8 bg-white shadow-lg">
          <img 
            src="/mea-logo.jpg" 
            alt="Chyme Logo" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Welcome to Chyme</h1>
          <p className="text-lg text-muted-foreground">
            The Messaging Space For Event People - Connect, Converse, Complete Events
          </p>
        </div>
        
        {/* CTA */}
        <div className="space-y-4">
          <Button 
            onClick={() => navigate("/auth")} 
            size="lg" 
            className="w-full max-w-sm"
          >
            Get Started
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account? <button onClick={() => navigate("/auth")} className="text-primary hover:underline">Sign in here</button>
          </p>
        </div>
      </div>
    </div>
  );
}
