import { Text } from '@/components/ui/text';
import { useSettings } from '@/lib/settings-store';
import * as React from 'react';
import { Image, View } from 'react-native';

// The jastiper's logo slot on printed output (Cetak penanda, Cetak
// tagihan customer): 101x47 in Figma. Shows the logo uploaded in
// Pengaturan, fitted inside the slot without cropping, or Figma's own
// grey "Logo Jastiper" placeholder box when none has been uploaded.
function JastiperLogo() {
  const { logoJastip } = useSettings();

  if (logoJastip) {
    return (
      <Image
        source={{ uri: logoJastip }}
        resizeMode="contain"
        style={{ width: 101, height: 47 }}
        accessibilityLabel="Logo jastiper"
      />
    );
  }

  return (
    <View className="h-[47px] w-[101px] items-center justify-center bg-neutral-300 p-[10px]">
      <Text className="font-inter text-[10px] text-neutral-800">Logo Jastiper</Text>
    </View>
  );
}

export { JastiperLogo };
