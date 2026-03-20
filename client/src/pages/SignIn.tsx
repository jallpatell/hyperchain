import { SignIn } from '@clerk/react';
import { useLocation } from 'wouter';

export default function SignInPage() {
  const [location] = useLocation();
  const redirectUrl = new URLSearchParams(window.location.search).get('redirect_url') || '/workflows';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl"
          }
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl={redirectUrl}
      />
    </div>
  );
}
