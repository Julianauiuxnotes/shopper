import ShopperLogo from '@/assets/images/figma/shopper-logo.svg';
import SplashDecoration from '@/assets/images/figma/splash-decoration.svg';
import { Text } from '@/components/ui/text';
import { useSettings } from '@/lib/settings-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import * as React from 'react';
import { Image, type LayoutChangeEvent, Pressable, useWindowDimensions, View } from 'react-native';

const HERO_IMAGE = require('@/assets/images/figma/splash-hero.png');
// All positions below are fractions of this screen's own rendered box,
// turned into pixel values from a size measured via onLayout — NOT CSS
// percentage strings. Derived from Figma's 390x927 reference frame
// (node 19:282), re-pulled 2026-09-29. This screen is a single
// full-bleed photo with everything else absolutely positioned on top of
// it, not separate header/hero/CTA sections.
//
// This used to be plain CSS percentages (`left: '-8.46%'` etc.), the
// textbook-correct way to do this — but it produced a visible,
// viewport-size-dependent gap on one edge of the hero photo on web
// (reported twice live: a vertical gap, then later a horizontal one at
// a different browser window size). RN-Web apparently doesn't resolve
// percentage insets against a `flex`-sized parent with pixel-perfect
// consistency at every aspect ratio. Measuring the actual rendered
// container via `onLayout` and computing literal pixel values
// sidesteps that rounding entirely — same fix pattern already proven
// for the BottomSheet's `max-h-[85%]` bug.

// Figma node 19:282 "Splash screen ". The "List" menu icon in that node
// sits at x=404 inside a 390px-wide frame — off-canvas / clipped in the
// original design — so it's intentionally not rendered here.
export default function SplashScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }

  const { ready: settingsReady } = useSettings();

  const ready = size.width > 0 && size.height > 0 && settingsReady;

  // A logged-in user is sent on to the dashboard by components/auth-gate.tsx.
  return (
    <View className="flex-1 overflow-hidden bg-[#eaeaea]" style={{ height: windowHeight }} onLayout={handleLayout}>
      {ready ? (
        <>
          {/* Photo crop box — node 53:2611 "Rectangle 1": left -33px, top 82px,
              w 456px, h 845px of the 390x927 frame. `cover`'s default centering
              lands within ~4% of Figma's own nested-crop focal point, which is
              used here since replicating the exact nested percentage crop
              (left -55.72%, top 19.64%, w 227.62%, h 81.95%) didn't render
              reliably via NativeWind/RN-Web (percentage width/height +
              resizeMode="stretch" on a nested absolute Image). */}
          <View
            className="absolute overflow-hidden"
            style={{
              left: size.width * -0.0846,
              top: size.height * 0.0885,
              width: size.width * 1.1692,
              height: size.height * 0.9115,
            }}>
            <Image
              source={HERO_IMAGE}
              resizeMode="cover"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
          </View>

          {/* Darkening scrim — node 116:12, a top-to-bottom gradient from
              5%-opacity white at 29.4% down to 50%-opacity black at 75.2%,
              so the buttons/wordmark near the bottom stay legible. */}
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.5)']}
            locations={[0.29437, 0.75172]}
            style={{ position: 'absolute', inset: 0 }}
          />

          <View className="absolute left-0 top-0 w-full items-center px-[10px] py-[20px]">
            <Text className="font-poppins text-[15px] text-neutral-800">Version 1.0</Text>
          </View>

          <View
            className="absolute"
            style={{
              left: size.width * 0.1887,
              top: size.height * 0.2458,
              width: size.width * 0.7808,
              aspectRatio: 304.53 / 200.18,
            }}>
            <SplashDecoration width="100%" height="100%" />
          </View>

          {/* Small "SHOPPER" wordmark — node 49:55, sits just below the button
              block near the bottom-right corner. */}
          <View
            className="absolute"
            style={{ bottom: size.height * 0.032, right: size.width * 0.057 }}>
            <ShopperLogo width={122} height={19.41} />
          </View>

          {/* Button block — node 116:11, added to the Figma file after this
              screen was first built here: "Buat akun" (primary), "Atau"
              divider, "Login" (secondary), overlaid directly on the photo. */}
          <View
            className="absolute gap-[5px]"
            style={{
              left: size.width * 0.145,
              width: size.width * 0.71,
              bottom: size.height * 0.081,
            }}>
            <Link href="/sign-up" asChild>
              <Pressable className="w-full items-center justify-center rounded-[12px] bg-orange-500 px-[10px] py-[16px]">
                <Text className="font-inter-semibold text-[14px] text-neutral-50">Buat akun</Text>
              </Pressable>
            </Link>
            <Text className="w-full text-center font-inter text-[12px] text-neutral-50">Atau</Text>
            <Link href="/login" asChild>
              <Pressable className="w-full items-center justify-center rounded-[12px] border border-orange-500 bg-[#f5f7fa] px-[10px] py-[16px]">
                <Text className="font-inter-semibold text-[14px] text-orange-500">Login</Text>
              </Pressable>
            </Link>
          </View>
        </>
      ) : null}
    </View>
  );
}
