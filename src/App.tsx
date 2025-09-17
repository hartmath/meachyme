import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Simple loading component
const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Chyme</h1>
        <p className="text-muted-foreground">Loading messaging platform...</p>
      </div>
    </div>
  );
};

// Simple test component
const TestPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center p-8 max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-foreground mb-4">Chyme</h1>
        <p className="text-muted-foreground mb-6">Messaging Platform</p>
        
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          ✅ Vercel deployment working!
        </div>
        
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          📱 Mobile compatible
        </div>
        
        <div className="bg-purple-100 border border-purple-400 text-purple-700 px-4 py-3 rounded mb-6">
          🌐 Chrome compatible
        </div>
        
        <p className="text-sm text-muted-foreground">
          Full Chyme app with messaging, calls, and groups is ready to deploy.
        </p>
        
        <div className="mt-6">
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TestPage />} />
        <Route path="*" element={<TestPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
