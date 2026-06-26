import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = 'Something went wrong',
  message = 'We encountered an error. Please try again.',
  onRetry
}: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
