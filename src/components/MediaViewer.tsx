import { useState } from "react";
import { X, Download, Share, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: "image" | "video";
  title?: string;
}

export function MediaViewer({ isOpen, onClose, mediaUrl, mediaType, title }: MediaViewerProps) {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setZoom(1);

  const handleDownload = () => {
    // In a real app, this would handle file download
    console.log("Downloading media:", mediaUrl);
  };

  const handleShare = () => {
    // In a real app, this would handle sharing
    if (navigator.share) {
      navigator.share({
        title: title || "Shared media",
        url: mediaUrl
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="text-white">
            <h3 className="font-medium">{title || "Media"}</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {mediaType === "image" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  className="text-white hover:bg-white/20"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" 
                  size="icon"
                  onClick={resetZoom}
                  className="text-white hover:bg-white/20"
                >
                  {Math.round(zoom * 100)}%
                </Button>
                <Button
                  variant="ghost"
                  size="icon" 
                  onClick={handleZoomIn}
                  className="text-white hover:bg-white/20"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-white hover:bg-white/20"
            >
              <Share className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Media Content */}
        <div className="flex items-center justify-center h-full p-16">
          {mediaType === "image" ? (
            <img
              src={mediaUrl}
              alt={title || "Media"}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
              onClick={resetZoom}
            />
          ) : (
            <video
              src={mediaUrl}
              controls
              className="max-w-full max-h-full"
              autoPlay
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}