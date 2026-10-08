import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import { Platform, View } from 'react-native';

// Screens that are bottom sheets over the page behind them. They slide in
// on their own (components/ui/bottom-sheet.tsx), and the page behind was
// visible all along, so neither animates here.
const SHEET_ROUTES = new Set(['buka-event-jastip', 'ganti-password']);

const DURATION_MS = 260;

// The route that last came into focus, shared by every screen's wrapper.
let lastFocusedRoute: string | null = null;

// Web only: the stack's own page transitions are a native feature, so in
// the browser a new page used to just appear. This fades each page in
// with a slight rise whenever it comes into view, going forward or back.
//
// Done with the browser's own element.animate() rather than a style that
// starts at opacity 0: it leaves nothing behind when it ends, and a page
// can never get stuck invisible if the animation doesn't run.
export function ScreenTransition({
  routeName,
  children,
}: {
  routeName: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<View>(null);

  useFocusEffect(
    React.useCallback(() => {
      const cameFromSheet = lastFocusedRoute !== null && SHEET_ROUTES.has(lastFocusedRoute);
      lastFocusedRoute = routeName;
      if (Platform.OS !== 'web' || SHEET_ROUTES.has(routeName) || cameFromSheet) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const element = ref.current as unknown as HTMLElement | null;
      element?.animate?.(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: DURATION_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
      );
    }, [routeName])
  );

  if (Platform.OS !== 'web' || SHEET_ROUTES.has(routeName)) return <>{children}</>;
  return (
    <View ref={ref} className="flex-1">
      {children}
    </View>
  );
}
