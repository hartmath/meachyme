import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Calendar, MapPin, UserCheck } from "lucide-react";

const roles = [
  {
    id: "vendor",
    title: "Vendor",
    description: "Catering, AV, decorations, and other event services",
    icon: Users,
    color: "bg-blue-500"
  },
  {
    id: "organizer", 
    title: "Event Organizer",
    description: "Plan, coordinate, and manage events from start to finish",
    icon: Calendar,
    color: "bg-green-500"
  },
  {
    id: "venue",
    title: "Venue Owner",
    description: "Provide spaces for conferences, weddings, and gatherings",
    icon: MapPin,
    color: "bg-purple-500"
  },
  {
    id: "attendee",
    title: "Attendee",
    description: "Participate in events, network, and stay connected",
    icon: UserCheck,
    color: "bg-orange-500"
  }
];

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedRole) {
      navigate("/onboarding/profile-setup", { state: { role: selectedRole } });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <header className="flex items-center mb-8 pt-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/onboarding/welcome")}
          className="mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-3 flex-1">
          <img 
            src="/mea-logo.jpg" 
            alt="MEA Chyme Logo" 
            className="w-8 h-8 rounded-full object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Choose Your Role</h1>
            <p className="text-muted-foreground">What best describes you?</p>
          </div>
        </div>
      </header>

      {/* Role Cards */}
      <div className="space-y-4 mb-8">
        {roles.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;
          
          return (
            <Card 
              key={role.id}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? "ring-2 ring-primary border-primary bg-primary/5" 
                  : "hover:shadow-md"
              }`}
              onClick={() => setSelectedRole(role.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${role.color} rounded-full flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{role.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {role.description}
                    </CardDescription>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button 
          onClick={handleContinue}
          disabled={!selectedRole}
          className="w-full"
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}