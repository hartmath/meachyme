import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">App Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Something went wrong with the app. Here are the details:
              </p>
              
            {this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <h4 className="font-semibold text-red-800 mb-2">Error:</h4>
                  <p className="text-sm text-red-700 font-mono">
                  {this.state.error.message}
                  </p>
                </div>
              )}
              
              {this.state.errorInfo && (
                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                  <h4 className="font-semibold text-gray-800 mb-2">Stack Trace:</h4>
                  <pre className="text-xs text-gray-700 overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                </pre>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Reload App
                </Button>
                <Button 
                  onClick={() => this.setState({ hasError: false })}
                  variant="outline"
                  className="flex-1"
                >
                  Try Again
                </Button>
          </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
