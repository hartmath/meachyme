import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Web Vitals reporting (use onINP instead of deprecated onFID)
try {
  import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
    import('./utils/vitals').then(({ reportWebVitals }) => {
      onCLS(reportWebVitals);
      onFCP(reportWebVitals);
      onLCP(reportWebVitals);
      onTTFB(reportWebVitals);
      onINP(reportWebVitals);
    });
  });
} catch {}

// Register service worker for caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
