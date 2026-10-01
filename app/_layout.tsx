import '@/global.css';

import { EventsProvider } from '@/lib/events-store';
import { SettingsProvider } from '@/lib/settings-store';
import { NAV_THEME } from '@/lib/theme';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Poppins_400Regular } from '@expo-google-fonts/poppins';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
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
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <EventsProvider>
        <SettingsProvider>
          {/* Web only: the app is designed for phone widths, but a desktop
              browser window has no such constraint by default. Center it in
              a phone-sized frame so `expo start --web` is a faithful
              preview. Native builds (Platform.OS !== 'web') are untouched. */}
          <View
            className={
              Platform.OS === 'web' ? 'mx-auto w-full max-w-[430px] flex-1 bg-white' : 'flex-1'
            }>
            <Stack screenOptions={{ headerShown: false }} />
          </View>
        </SettingsProvider>
      </EventsProvider>
      <PortalHost />
    </ThemeProvider>
  );
}
