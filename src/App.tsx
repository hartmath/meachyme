import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Simple test component
const TestPage = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">Chyme</h1>
        <p className="text-muted-foreground mb-4">Messaging Platform</p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          ✅ Vercel deployment is working!
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          If you can see this, the basic React app is loading correctly.
        </p>
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
