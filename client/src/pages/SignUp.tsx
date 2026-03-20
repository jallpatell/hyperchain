import { SignUp } from '@clerk/react';
import { useLocation } from 'wouter';

export default function SignUpPage() {
  const [location] = useLocation();
  const redirectUrl = new URLSearchParams(window.location.search).get('redirect_url') || '/workflows';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl"
          }
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl={redirectUrl}
      />
    </div>
  );
}
