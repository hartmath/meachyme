import { useState } from "react";
import { ArrowLeft, Search, MessageCircle, Phone, Video, Users, Settings, Bell, Shield, HelpCircle, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function Help() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const faqCategories = [
    {
      title: "Getting Started",
      icon: <HelpCircle className="h-5 w-5" />,
      items: [
        {
          question: "How do I create an account?",
          answer: "Click 'Sign Up' on the login page and enter your email address. You'll receive a confirmation email to verify your account."
        },
        {
          question: "How do I set up my profile?",
          answer: "After signing up, you'll go through an onboarding process where you can set your name, bio, role, and upload a profile picture."
        },
        {
          question: "What user roles are available?",
          answer: "You can choose from: Event Organizer, Vendor, Venue Owner, or Attendee. This helps others understand your role in the event industry."
        }
      ]
    },
    {
      title: "Messaging & Chat",
      icon: <MessageCircle className="h-5 w-5" />,
      items: [
        {
          question: "How do I start a conversation?",
          answer: "Go to the Chats tab and tap the '+' button to start a new chat, or find someone in Contact Discovery and tap 'Connect'."
        },
        {
          question: "Can I send voice messages?",
          answer: "Yes! Tap the microphone icon in any chat to record and send voice messages. You can also send images and documents."
        },
        {
          question: "How do message reactions work?",
          answer: "Tap the smiley face icon on any message to add emoji reactions. You can see who reacted and how many people used each emoji."
        },
        {
          question: "What's the difference between direct messages and group chats?",
          answer: "Direct messages are 1-on-1 conversations, while group chats allow multiple people to participate in the same conversation."
        }
      ]
    },
    {
      title: "Calls & Video",
      icon: <Video className="h-5 w-5" />,
      items: [
        {
          question: "How do I make a voice or video call?",
          answer: "In any chat, tap the phone icon for voice calls or the video icon for video calls. The other person will receive a notification."
        },
        {
          question: "Can I make group calls?",
          answer: "Yes! In group chats, you can start group voice or video calls that all group members can join."
        },
        {
          question: "What if I miss a call?",
          answer: "Missed calls will appear in your Calls tab with the caller's information and timestamp."
        }
      ]
    },
    {
      title: "Groups & Events",
      icon: <Users className="h-5 w-5" />,
      items: [
        {
          question: "How do I create a group?",
          answer: "Go to the Groups tab and tap 'Create Group'. Add a name, description, and invite members to get started."
        },
        {
          question: "How do I manage group settings?",
          answer: "In any group chat, tap the group name at the top to access group settings where you can manage members and permissions."
        },
        {
          question: "How do I create an event?",
          answer: "Go to the Events tab and tap 'Create Event' to set up a new event with details, date, and location information."
        }
      ]
    },
    {
      title: "Settings & Privacy",
      icon: <Settings className="h-5 w-5" />,
      items: [
        {
          question: "How do I change my notification settings?",
          answer: "Go to Profile > Settings > Notifications to customize which notifications you receive for messages, calls, and events."
        },
        {
          question: "How do I block someone?",
          answer: "In any chat, tap the menu (three dots) and select 'Block User'. You can manage blocked users in Settings > Privacy."
        },
        {
          question: "How do I delete my account?",
          answer: "Go to Profile > Settings > Privacy and scroll down to find the account deletion option. This action cannot be undone."
        }
      ]
    }
  ];

  const contactOptions = [
    {
      title: "Email Support",
      description: "Get help via email within 24 hours",
      icon: <Mail className="h-5 w-5" />,
      action: "support@collabeventspace.com"
    },
    {
      title: "Community Forum",
      description: "Connect with other users and get community help",
      icon: <Users className="h-5 w-5" />,
      action: "Visit Forum",
      external: true
    },
    {
      title: "Feature Requests",
      description: "Suggest new features and improvements",
      icon: <ExternalLink className="h-5 w-5" />,
      action: "Submit Request",
      external: true
    }
  ];

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">Help & Support</h1>
            <p className="text-sm text-muted-foreground">Find answers and get help</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/contact-discovery")}>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium text-sm">Find People</h3>
              <p className="text-xs text-muted-foreground">Connect with event professionals</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/settings/notifications")}>
            <CardContent className="p-4 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium text-sm">Notifications</h3>
              <p className="text-xs text-muted-foreground">Manage your alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Frequently Asked Questions</h2>
          
          {filteredCategories.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {filteredCategories.map((category, categoryIndex) => (
                <AccordionItem key={categoryIndex} value={`category-${categoryIndex}`} className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center space-x-3">
                      {category.icon}
                      <span className="font-medium">{category.title}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {category.items.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    {category.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="border-l-2 border-muted pl-4">
                        <h4 className="font-medium text-sm text-foreground mb-1">
                          {item.question}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : searchQuery ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground mb-2">No results found</h3>
                <p className="text-sm text-muted-foreground">
                  Try searching with different keywords or browse the categories below.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Contact Support */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Contact Support</h2>
          <div className="space-y-3">
            {contactOptions.map((option, index) => (
              <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{option.title}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-primary">
                        {option.action}
                      </p>
                      {option.external && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* App Version */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Collab Event Space v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
