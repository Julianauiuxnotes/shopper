import { useAuth } from '@/lib/auth-store';
import { useRouter, useSegments } from 'expo-router';
import * as React from 'react';

// Screens anyone may open without logging in: the welcome screen, login
// and sign-up, and the two customer-facing pages (order form, receipt).
const PUBLIC_ROUTES = ['', 'login', 'sign-up', 'o', 'r', '+not-found', '_sitemap'];
// Of those, the ones a logged-in user has no reason to see.
const ENTRY_ROUTES = ['', 'login', 'sign-up'];

// Keeps logged-out visitors out of the jastiper's screens and sends
// logged-in users past the welcome/login screens. Renders nothing;
// mounted once in app/_layout.tsx.
function AuthGate() {
  const { ready, signedIn, notice } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const route = segments[0] ?? '';

  React.useEffect(() => {
    if (!ready) return;
    // Logged out with something to explain (the account became active on
    // another device): go to the login screen, which shows the message.
    if (!signedIn && !PUBLIC_ROUTES.includes(route)) router.replace(notice ? '/login' : '/');
    else if (signedIn && ENTRY_ROUTES.includes(route)) router.replace('/dashboard');
  }, [ready, signedIn, notice, route, router]);

  return null;
}

export { AuthGate };
