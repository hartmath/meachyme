import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Sentry (guarded by env)
try {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn) {
    // dynamic import to avoid bundling when not used
    // @ts-ignore
    import('@sentry/react').then((Sentry) => {
      Sentry.init({ dsn });
    });
  }
} catch {}
// Web Vitals reporting
try {
  import('web-vitals').then(({ onCLS, onFID, onLCP, onINP }) => {
    import('./utils/vitals').then(({ reportWebVitals }) => {
      onCLS(reportWebVitals);
      onFID(reportWebVitals);
      onLCP(reportWebVitals);
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
