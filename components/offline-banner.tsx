import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth-store';
import { useOffline } from '@/lib/sync-status';
import * as React from 'react';
import { View } from 'react-native';

// Shown across the top of the jastiper's screens while the server can't
// be reached. The app keeps working: changes are saved on the device and
// sent by components/data-sync.tsx once the connection is back.
function OfflineBanner() {
  const offline = useOffline();
  const { signedIn } = useAuth();
  if (!offline || !signedIn) return null;
  return (
    <View accessibilityRole="alert" className="bg-neutral-800 px-[16px] py-[8px]">
      <Text className="text-center font-inter text-[11px] text-neutral-50">
        Kamu sedang offline. Perubahan disimpan di perangkat ini dan akan disinkronkan saat online
        kembali.
      </Text>
    </View>
  );
}

export { OfflineBanner };
