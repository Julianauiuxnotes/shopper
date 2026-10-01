import { cn } from '@/lib/utils';
import * as React from 'react';
import { Animated, Platform, Pressable, useWindowDimensions, View } from 'react-native';

const DURATION_IN = 300;
const DURATION_OUT = 220;
const DRAWER_WIDTH = 248;

type SideDrawerProps = {
  onClose: () => void;
  children: (close: (onComplete?: () => void) => void) => React.ReactNode;
};

// Figma node 161:140 "Menu collapsed" — the hamburger-menu drawer that
// slides in from the right over the current screen (currently only
// Dashboard triggers it). Mirrors components/ui/bottom-sheet.tsx's
// approach (same web-only `position:'fixed'` + phone-frame-width
// centering, same "never put className on Animated.View" rule, same
// RN `Animated` API instead of Reanimated) but slides horizontally
// (translateX) instead of vertically. `close` takes an optional
// `onComplete` callback so a menu item can play the close animation
// AND navigate once it finishes, while the backdrop/X button just call
// `close()` with no argument to dismiss in place.
export function SideDrawer({ onClose, children }: SideDrawerProps) {
  const { height: screenHeight } = useWindowDimensions();
  const translateX = React.useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: DURATION_IN, useNativeDriver: false }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: DURATION_IN,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  function close(onComplete?: () => void) {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: DRAWER_WIDTH,
        duration: DURATION_OUT,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: DURATION_OUT,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onClose();
        onComplete?.();
      }
    });
  }

  return (
    <View
      style={
        Platform.OS === 'web' ? { position: 'fixed', top: 0, bottom: 0 } : { height: screenHeight }
      }
      className={cn(
        'w-full',
        // Same web-preview-only centering as BottomSheet: a `fixed` overlay
        // spans the real browser viewport, which is wider than the phone-
        // frame column app/_layout.tsx simulates on web.
        Platform.OS === 'web' && 'left-0 right-0 mx-auto max-w-[430px]'
      )}>
      {/* Animated.View doesn't pick up NativeWind's `className` — see
          bottom-sheet.tsx's note. Layout/color classes live on plain View
          children; the Animated.View wrappers carry only animated style. */}
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
        <Pressable className="flex-1 bg-black/50" onPress={() => close()} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: DRAWER_WIDTH,
          transform: [{ translateX }],
        }}>
        <View className="h-full w-full rounded-tl-[61px] bg-orange-500 px-[28px] py-[40px] shadow-lg">
          {children(close)}
        </View>
      </Animated.View>
    </View>
  );
}
