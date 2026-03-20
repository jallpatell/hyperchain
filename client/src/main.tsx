import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import App from './App';
import './index.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={publishableKey} 
      afterSignOutUrl="/"
      signInFallbackRedirectUrl={window.location.pathname}
      signUpFallbackRedirectUrl={window.location.pathname}
    >
      <App />
    </ClerkProvider>
  </StrictMode>
);
