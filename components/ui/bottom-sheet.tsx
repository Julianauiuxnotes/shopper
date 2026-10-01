import { cn } from '@/lib/utils';
import * as React from 'react';
import { Animated, Platform, Pressable, useWindowDimensions, View } from 'react-native';

const DURATION_IN = 300;
const DURATION_OUT = 220;

type BottomSheetProps = {
  onClose: () => void;
  sheetClassName?: string;
  children: (close: () => void) => React.ReactNode;
};

// expo-router's own `animation: 'slide_from_bottom'` on a transparentModal
// route doesn't actually animate on web — React Navigation's native-stack
// transitions are a native-platform feature, so on web the sheet just pops
// in instantly. This drives the same slide-up + backdrop-fade with RN's
// own Animated API instead, so it's smooth and identical on web/iOS/
// Android rather than depending on the platform's native transition.
// `useNativeDriver: false` because react-native-web doesn't support the
// native driver — translateY/opacity are cheap enough that a JS-driven
// animation still looks smooth. Used by both Buka Event Jastip and Ganti
// Password (previously each hand-rolled its own backdrop + sheet View).
export function BottomSheet({ onClose, sheetClassName, children }: BottomSheetProps) {
  // A plain `flex-1` root doesn't reliably resolve to the full viewport
  // height on RN-Web inside a transparentModal route (same class of bug as
  // the Splash screen's hero container). Measured live: `useWindowDimensions()`
  // itself under-reports on web (722px vs the browser's real 778px
  // `window.innerHeight` in one check) — close but not exact, which was
  // just enough to leave an unshaded strip of the real viewport showing
  // below the sheet/backdrop. `position: 'fixed'` sidesteps needing any
  // measured height at all: the browser resolves it directly against the
  // true viewport. Native platforms don't have this problem (React
  // Navigation's transparentModal is a real full-screen presentation
  // there), so they keep the plain flex sizing `useWindowDimensions()`
  // still feeds (used below for the animation's offscreen start/end value).
  const { height: screenHeight } = useWindowDimensions();
  const translateY = React.useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: DURATION_IN, useNativeDriver: false }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: DURATION_IN,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  function close() {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: DURATION_OUT,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: DURATION_OUT,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  }

  return (
    <View
      style={
        Platform.OS === 'web' ? { position: 'fixed', top: 0, bottom: 0 } : { height: screenHeight }
      }
      className={cn(
        'w-full',
        // On web this fixed overlay spans the real browser viewport, which
        // is wider than the app — match app/_layout.tsx's own phone-frame
        // centering (`mx-auto w-full max-w-[430px]`, web-only there too) so
        // the sheet/backdrop line up with the app column instead of
        // covering the whole browser window edge-to-edge.
        Platform.OS === 'web' && 'left-0 right-0 mx-auto max-w-[430px]'
      )}>
      {/* Animated.View doesn't pick up NativeWind's `className` the way a
          plain View does, so every layout/color class here has to sit on a
          plain View child — the Animated.View wrapper carries ONLY the
          animated inline style and is otherwise a transparent passthrough. */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: backdropOpacity,
        }}
        pointerEvents="box-none">
        <Pressable className="flex-1 bg-black/50" onPress={close} />
      </Animated.View>
      <Animated.View style={{ marginTop: 'auto', transform: [{ translateY }] }}>
        {/* `max-h-[85%]` (a CSS percentage) doesn't reliably resolve against
            this auto-height flex wrapper — measured live: it left a ~49px
            unfilled strip between the visible sheet and the wrapper's own
            (correctly bottom-anchored) edge, which is what showed as a grey
            gap below the sheet. A pixel value computed from the already-
            measured `screenHeight` sidesteps that percentage-resolution
            issue entirely. */}
        <View
          style={{ maxHeight: Math.round(screenHeight * 0.85) }}
          className={cn('w-full overflow-hidden rounded-t-[12px]', sheetClassName)}>
          {children(close)}
        </View>
      </Animated.View>
    </View>
  );
}
