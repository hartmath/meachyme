import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Logo/Icon */}
        <div className="w-24 h-24 rounded-full overflow-hidden mb-8 mx-auto bg-white shadow-lg">
          <img 
            src="/mea-logo.jpg" 
            alt="MEA Chyme Logo" 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Welcome Text */}
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Welcome to MEA Chyme
        </h1>
        
        <p className="text-lg text-muted-foreground mb-2">
          The event people space
        </p>
        
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Connect, chat, and share updates with vendors, organizers, venue owners, and attendees all in one place.
        </p>

        {/* Get Started Button */}
        <Button 
          onClick={() => navigate("/onboarding/role-selection")}
          className="w-full mb-4"
          size="lg"
        >
          Get Started
        </Button>

        <p className="text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}