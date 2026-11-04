import * as React from 'react';

/** How long a short confirmation ("✓ Tersimpan", "✓ Link tersalin", …) stays. */
export const FEEDBACK_MS = 3000;

/**
 * Turns a confirmation flag back off FEEDBACK_MS after it turns on, so
 * every "✓ …" message in the app disappears on its own, after the same time.
 */
export function useAutoReset(flag: boolean, reset: () => void, ms = FEEDBACK_MS) {
  const resetRef = React.useRef(reset);
  resetRef.current = reset;
  React.useEffect(() => {
    if (!flag) return;
    const timer = setTimeout(() => resetRef.current(), ms);
    return () => clearTimeout(timer);
  }, [flag, ms]);
}
