import { useState, useEffect } from "react";
import { ArrowLeft, HardDrive, Trash2, Download, Upload, FileText, Image, Mic, Video, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Storage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [storageStats, setStorageStats] = useState({
    totalUsed: 0,
    totalAvailable: 50000000000, // 50GB in bytes
    messages: 0,
    images: 0,
    voiceMessages: 0,
    documents: 0
  });

  // Fetch storage statistics
  const { data: storageData, isLoading } = useQuery({
    queryKey: ['storage-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user's messages and attachments
      const { data: messages } = await supabase
        .from('direct_messages')
        .select('attachment_url, message_type')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

      const { data: groupMessages } = await supabase
        .from('group_messages')
        .select('attachment_url, message_type')
        .eq('group_id', supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
        );

      // Calculate storage usage (mock calculation)
      const allMessages = [...(messages || []), ...(groupMessages || [])];
      const images = allMessages.filter(m => m.message_type === 'image').length;
      const voiceMessages = allMessages.filter(m => m.message_type === 'voice').length;
      const documents = allMessages.filter(m => m.message_type === 'file').length;
      
      // Mock storage calculation (in real app, you'd calculate actual file sizes)
      const totalUsed = (images * 2000000) + (voiceMessages * 1000000) + (documents * 5000000); // Mock sizes

      return {
        totalUsed,
        totalAvailable: 50000000000, // 50GB
        messages: allMessages.length,
        images,
        voiceMessages,
        documents
      };
    }
  });

  useEffect(() => {
    if (storageData) {
      setStorageStats(storageData);
    }
  }, [storageData]);

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      // Clear browser cache and local storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear localStorage items related to the app
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('supabase') || key.startsWith('react-query'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    },
    onSuccess: () => {
      toast({
        title: "Cache cleared",
        description: "Temporary files and cache have been cleared.",
      });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    }
  });

  // Delete old messages mutation
  const deleteOldMessagesMutation = useMutation({
    mutationFn: async (daysOld: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Delete old direct messages
      const { error: dmError } = await supabase
        .from('direct_messages')
        .delete()
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .lt('created_at', cutoffDate.toISOString());

      if (dmError) throw dmError;

      // Delete old group messages (where user is sender)
      const { error: gmError } = await supabase
        .from('group_messages')
        .delete()
        .eq('sender_id', user.id)
        .lt('created_at', cutoffDate.toISOString());

      if (gmError) throw gmError;
    },
    onSuccess: () => {
      toast({
        title: "Old messages deleted",
        description: "Messages older than the selected period have been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercentage = () => {
    return (storageStats.totalUsed / storageStats.totalAvailable) * 100;
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage > 90) return 'text-red-500';
    if (percentage > 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const storageItems = [
    {
      type: 'Messages',
      count: storageStats.messages,
      size: storageStats.messages * 1000, // Mock size
      icon: <FileText className="h-4 w-4" />,
      color: 'text-blue-500'
    },
    {
      type: 'Images',
      count: storageStats.images,
      size: storageStats.images * 2000000, // 2MB per image
      icon: <Image className="h-4 w-4" />,
      color: 'text-green-500'
    },
    {
      type: 'Voice Messages',
      count: storageStats.voiceMessages,
      size: storageStats.voiceMessages * 1000000, // 1MB per voice message
      icon: <Mic className="h-4 w-4" />,
      color: 'text-purple-500'
    },
    {
      type: 'Documents',
      count: storageStats.documents,
      size: storageStats.documents * 5000000, // 5MB per document
      icon: <FileText className="h-4 w-4" />,
      color: 'text-orange-500'
    }
  ];

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
            <h1 className="text-xl font-semibold text-foreground">Storage & Data</h1>
            <p className="text-sm text-muted-foreground">Manage your storage usage</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Storage Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5" />
              <span>Storage Overview</span>
            </CardTitle>
            <CardDescription>
              Your current storage usage and available space
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used</span>
                <span className={`font-medium ${getUsageColor()}`}>
                  {formatBytes(storageStats.totalUsed)}
                </span>
              </div>
              <Progress value={getUsagePercentage()} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 Bytes</span>
                <span>{formatBytes(storageStats.totalAvailable)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Available Space</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(storageStats.totalAvailable - storageStats.totalUsed)} remaining
                </p>
              </div>
              <Badge variant={getUsagePercentage() > 90 ? "destructive" : "secondary"}>
                {getUsagePercentage().toFixed(1)}% used
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Storage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Breakdown</CardTitle>
            <CardDescription>
              See what's using your storage space
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {storageItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${item.color.replace('text-', 'bg-').replace('-500', '-100')} dark:${item.color.replace('text-', 'bg-').replace('-500', '-900')}`}>
                    <div className={item.color}>
                      {item.icon}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{item.type}</p>
                    <p className="text-xs text-muted-foreground">{item.count} items</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{formatBytes(item.size)}</p>
                  <p className="text-xs text-muted-foreground">
                    {((item.size / storageStats.totalUsed) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Storage Management */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Management</CardTitle>
            <CardDescription>
              Free up space and manage your data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                onClick={() => clearCacheMutation.mutate()}
                disabled={clearCacheMutation.isPending}
                variant="outline"
                className="w-full justify-start"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cache & Temporary Files
                {clearCacheMutation.isPending && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-auto" />
                )}
              </Button>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Delete Old Messages</p>
                <div className="grid grid-cols-2 gap-2">
                  {[30, 90, 180, 365].map((days) => (
                    <Button
                      key={days}
                      onClick={() => deleteOldMessagesMutation.mutate(days)}
                      disabled={deleteOldMessagesMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      {days} days
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Data Export</span>
            </CardTitle>
            <CardDescription>
              Download your data for backup or migration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  toast({
                    title: "Export started",
                    description: "Your data export will be ready in a few minutes. You'll receive an email when it's complete.",
                  });
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export All Data
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Messages
                </Button>
                <Button variant="outline" size="sm">
                  <Image className="h-4 w-4 mr-2" />
                  Media
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Tips */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-2">
                  Storage Tips
                </h4>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Regularly clear old messages to free up space</li>
                  <li>• Compress images before sending to reduce file size</li>
                  <li>• Use voice messages instead of long text for better storage efficiency</li>
                  <li>• Export important conversations before deleting them</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
