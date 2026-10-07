import '@/global.css';

import { IncomingOrdersSync } from '@/components/incoming-orders-sync';
import { AuthGate } from '@/components/auth-gate';
import { DataSync } from '@/components/data-sync';
import { OfflineBanner } from '@/components/offline-banner';
import { AuthProvider } from '@/lib/auth-store';
import { EventsProvider } from '@/lib/events-store';
import { SettingsProvider } from '@/lib/settings-store';
import { NAV_THEME } from '@/lib/theme';
// Per-weight entry points, not the package root: importing from
// '@expo-google-fonts/inter' drags every weight's .ttf (36 files, ~9 MB)
// into the web export even though only these four are used.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { PortalHost } from '@rn-primitives/portal';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      {/* Web tab title. expo-router statically renders an empty <title>
          ahead of the one in +html.tsx, so it has to be set through Head. */}
      {Platform.OS === 'web' ? (
        <Head>
          <title>Shopper</title>
        </Head>
      ) : null}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <EventsProvider>
        <SettingsProvider>
          <AuthProvider>
            <AuthGate />
            <DataSync />
            <IncomingOrdersSync />
            {/* Web only: the app is designed for phone widths, but a desktop
              browser window has no such constraint by default. Center it in
              a phone-sized frame so `expo start --web` is a faithful
              preview. Native builds (Platform.OS !== 'web') are untouched. */}
            <View
              className={
                Platform.OS === 'web' ? 'mx-auto w-full max-w-[430px] flex-1 bg-white' : 'flex-1'
              }>
              <OfflineBanner />
              <Stack screenOptions={{ headerShown: false, title: 'Shopper' }} />
            </View>
          </AuthProvider>
        </SettingsProvider>
      </EventsProvider>
      <PortalHost />
    </ThemeProvider>
  );
}
