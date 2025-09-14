import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  text?: string;
}

export function Loading({ 
  className, 
  size = "md", 
  showText = true, 
  text = "Loading..." 
}: LoadingProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
      <div className={cn(
        "rounded-full overflow-hidden bg-white shadow-lg animate-pulse",
        sizeClasses[size]
      )}>
        <img 
          src="/mea-logo.jpg" 
          alt="Loading" 
          className="w-full h-full object-cover animate-spin"
          style={{ 
            animationDuration: "2s",
            animationTimingFunction: "ease-in-out"
          }}
        />
      </div>
      {showText && (
        <p className="text-muted-foreground text-sm font-medium">{text}</p>
      )}
    </div>
  );
}

// Full screen loading variant
export function FullScreenLoading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loading size="lg" text={text} />
    </div>
  );
}