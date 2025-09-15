import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
}

export function VoiceMessagePlayer({ audioUrl, duration }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setAudioDuration(audio.duration || duration || 0);
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg max-w-xs">
      <Button
        onClick={togglePlay}
        size="sm"
        variant="outline"
        className="rounded-full w-8 h-8 p-0"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        ) : isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center space-x-2">
          <Volume2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Voice message
          </span>
        </div>
        
        <div className="space-y-1">
          <div className="w-full bg-muted rounded-full h-1">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{isLoading ? "..." : formatTime(audioDuration)}</span>
          </div>
        </div>
      </div>
      
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onError={(e) => {
          console.error('Audio load error:', e);
          setIsLoading(false);
        }}
      />
    </div>
  );
}
