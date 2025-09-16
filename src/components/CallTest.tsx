import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { WebRTCManager } from "@/utils/webrtc";

export function CallTest() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testWebRTCSupport = () => {
    addResult("Testing WebRTC support...");
    
    // Check if WebRTC is supported
    if (!window.RTCPeerConnection) {
      addResult("❌ WebRTC not supported in this browser");
      return false;
    }
    addResult("✅ WebRTC is supported");

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addResult("❌ getUserMedia not supported");
      return false;
    }
    addResult("✅ getUserMedia is supported");

    // Check HTTPS
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      addResult("❌ HTTPS required for WebRTC (current: " + location.protocol + ")");
      return false;
    }
    addResult("✅ HTTPS connection detected");

    return true;
  };

  const testMediaAccess = async () => {
    addResult("Testing media access...");
    
    try {
      // Test audio access
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addResult("✅ Audio access granted");
      audioStream.getTracks().forEach(track => track.stop());

      // Test video access
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      addResult("✅ Video access granted");
      videoStream.getTracks().forEach(track => track.stop());

      return true;
    } catch (error: any) {
      addResult(`❌ Media access failed: ${error.message}`);
      return false;
    }
  };

  const testPeerConnection = () => {
    addResult("Testing peer connection...");
    
    try {
      const config: RTCConfiguration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      };
      
      const pc = new RTCPeerConnection(config);
      addResult("✅ Peer connection created successfully");
      
      pc.close();
      addResult("✅ Peer connection closed successfully");
      
      return true;
    } catch (error: any) {
      addResult(`❌ Peer connection failed: ${error.message}`);
      return false;
    }
  };

  const runAllTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    addResult("🚀 Starting WebRTC diagnostic tests...");
    
    // Test 1: WebRTC Support
    const supportOk = testWebRTCSupport();
    
    if (supportOk) {
      // Test 2: Media Access
      const mediaOk = await testMediaAccess();
      
      if (mediaOk) {
        // Test 3: Peer Connection
        testPeerConnection();
      }
    }
    
    addResult("🏁 Tests completed!");
    setIsTesting(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>WebRTC Call Diagnostic</CardTitle>
        <CardDescription>
          Test your browser's WebRTC capabilities and identify call issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runAllTests} 
            disabled={isTesting}
            className="flex-1"
          >
            {isTesting ? "Running Tests..." : "Run Diagnostic Tests"}
          </Button>
          <Button 
            onClick={clearResults} 
            variant="outline"
            disabled={isTesting}
          >
            Clear Results
          </Button>
        </div>
        
        {testResults.length > 0 && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Test Results:</h4>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <p><strong>Common Issues:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>HTTPS required for WebRTC (except localhost)</li>
            <li>Camera/microphone permissions must be granted</li>
            <li>Firewall or network restrictions</li>
            <li>Browser compatibility issues</li>
            <li>Device hardware problems</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
