import BrandLogo from '@/assets/images/figma/justipers-logo.svg';
import SplashTagline from '@/assets/images/figma/splash-tagline.svg';
import { LanguageSwitch } from '@/components/language-switch';
import { Text } from '@/components/ui/text';
import { useLanguage } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-store';
import { Link } from 'expo-router';
import * as React from 'react';
import { Image, type LayoutChangeEvent, Pressable, useWindowDimensions, View } from 'react-native';

// Figma node 308:174 "Splash screen". The photo is the design's own,
// cropped to the part the frame shows and compressed (the Figma original
// is a 12 MB, 4096 px image).
const PHOTO = require('@/assets/images/splash-photo.jpg');

// The design is a 390 x 927 frame. Phones differ in both width and
// height, so the parts are anchored the way they read: the photo and the
// wordmark from the top, the orange panel with its tagline and buttons
// from the bottom, all centred as the 390 px frame would be. On a short
// screen the panel simply covers more of the photo's lower half.
//
// Pixel positions come from the screen's measured size (onLayout) rather
// than CSS percentages, which RN-Web didn't resolve consistently here.
const FRAME_WIDTH = 390;
const FRAME_HEIGHT = 927;

// Not in Figma. The tagline artwork above is Indonesian lettering drawn as
// shapes, so English gets the same look in live text: white, bold and
// slanted, one large word with two small ones stacked beside it, each
// line centred in the artwork's 205 x 98 box.
const TAGLINE_TEXT = { color: '#fafafa', includeFontPadding: false } as const;
const SLANT = { transform: [{ skewX: '-12deg' }] };

function EnglishTagline() {
  return (
    <View
      style={[{ width: 205.385, height: 97.822 }, SLANT]}
      className="items-center justify-between">
      <View className="flex-row items-center gap-[6px]">
        <Text style={[TAGLINE_TEXT, { fontSize: 44, lineHeight: 40 }]} className="font-inter-bold">
          NO.1
        </Text>
        <View>
          <Text
            style={[TAGLINE_TEXT, { fontSize: 14, lineHeight: 15 }]}
            className="font-inter-bold">
            ORDER
          </Text>
          <Text
            style={[TAGLINE_TEXT, { fontSize: 14, lineHeight: 15 }]}
            className="font-inter-bold">
            APP
          </Text>
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={[TAGLINE_TEXT, { fontSize: 23, lineHeight: 30 }]}
        className="font-inter-bold">
        FOR PERSONAL
      </Text>
      <Text style={[TAGLINE_TEXT, { fontSize: 29, lineHeight: 30 }]} className="font-inter-bold">
        SHOPPERS
      </Text>
    </View>
  );
}

export default function SplashScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const { ready: settingsReady } = useSettings();
  const { language, t } = useLanguage();

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }

  const ready = size.width > 0 && size.height > 0 && settingsReady;
  // How far the 390 px frame sits from the left edge of this screen.
  const dx = (size.width - FRAME_WIDTH) / 2;
  // Distance of a point near the bottom of the frame from its bottom edge.
  const fromBottom = (frameTop: number) => FRAME_HEIGHT - frameTop;

  // A logged-in user is sent on to the dashboard by components/auth-gate.tsx.
  return (
    <View
      className="flex-1 overflow-hidden bg-[#eaeaea]"
      style={{ height: windowHeight }}
      onLayout={handleLayout}>
      {ready ? (
        <>
          {/* Node 308:177: the photo, at the size and place the frame shows it. */}
          <Image
            source={PHOTO}
            resizeMode="stretch"
            accessible={false}
            style={{ position: 'absolute', left: dx - 33, top: -7, width: 456, height: 679 }}
          />

          {/* Node 317:85: the Justipers logo, top right. */}
          <View className="absolute" style={{ left: dx + 221, top: 41 }}>
            <BrandLogo width={130} height={45} />
          </View>

          {/* Not in Figma: the language choice, top left across from the logo. */}
          <View className="absolute" style={{ left: dx + 24, top: 50 }}>
            <LanguageSwitch />
          </View>

          {/* Node 308:189: the orange panel, rounded at the top. */}
          <View
            className="absolute bottom-0 left-0 right-0 rounded-tl-[110px] rounded-tr-[110px] bg-orange-500"
            style={{ height: fromBottom(540) }}
          />

          {/* Node 308:178: "KELOLA SAT SET JASTIP ANTI RIBET". */}
          <View
            accessible
            accessibilityLabel={t('Kelola sat set, jastip anti ribet')}
            className="absolute"
            style={{ left: dx + 87.61, top: size.height - fromBottom(585) }}>
            {language === 'en' ? (
              <EnglishTagline />
            ) : (
              <SplashTagline width={205.385} height={97.822} />
            )}
          </View>

          {/* Node 308:190: the buttons. */}
          <View
            className="absolute w-[277px] gap-[16px]"
            style={{ left: dx + 52, bottom: fromBottom(745) - (46.333 * 2 + 16 * 2 + 12.333) }}>
            <Link href="/sign-up" asChild>
              <Pressable className="h-[46.333px] w-full items-center justify-center rounded-[12px] border border-orange-500 bg-[#f5f7fa] px-[10px]">
                <Text className="font-inter-semibold text-[14px] text-orange-500">
                  {t('Daftar')}
                </Text>
              </Pressable>
            </Link>
            <Text className="w-full text-center font-inter text-[12px] text-neutral-50">
              {t('Atau sudah punya akun?')}
            </Text>
            <Link href="/login" asChild>
              <Pressable className="h-[46.333px] w-full items-center justify-center rounded-[12px] border border-neutral-50 px-[10px]">
                <Text className="font-inter-semibold text-[14px] text-neutral-50">
                  {t('Masuk')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </>
      ) : null}
    </View>
  );
}
