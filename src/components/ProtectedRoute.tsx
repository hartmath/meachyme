import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoading } from '@/components/Loading';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // After first load, mark as not initial load
    if (!loading) {
      const timer = setTimeout(() => setIsInitialLoad(false), 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Show loading only on initial load
  if (loading && isInitialLoad) {
    return <FullScreenLoading />;
  }

  // Redirect to auth if no session
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Render children with fade-in effect
  return (
    <div className={`transition-opacity duration-200 ${isInitialLoad ? 'opacity-0' : 'opacity-100'}`}>
      {children}
    </div>
  );
}