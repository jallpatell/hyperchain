import { useAuth } from '@clerk/react';
import { Redirect, useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [location] = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    // Redirect to sign-in with the current location as redirect_url
    const redirectUrl = encodeURIComponent(location);
    return <Redirect to={`/sign-in?redirect_url=${redirectUrl}`} />;
  }

  return <>{children}</>;
}
