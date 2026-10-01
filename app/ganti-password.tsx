import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import EyeIcon from '@/assets/images/figma/icon-eye.svg';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useSettings } from '@/lib/settings-store';
import { cn } from '@/lib/utils';
import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

// No Figma design exists for this yet — a bottom sheet reached from
// Pengaturan's "Ganti password" link (app/settings.tsx). Uses the shared
// BottomSheet (components/ui/bottom-sheet.tsx) for the slide-up + backdrop
// animation, same as Buka Event Jastip (app/buka-event-jastip.tsx) —
// `animation: 'none'` on the Stack.Screen below because that animation is
// now handled by BottomSheet itself, not expo-router's native-stack
// transition (which doesn't animate on web at all). Two fields —
// "Password baru" and "Konfirmasi password baru" — must match before
// Simpan is enabled; a mismatch shows an inline error the same way Sign
// Up's "Verifikasi Password" field does. On save, writes straight into
// lib/settings-store's userProfile.password and closes the sheet.
export default function GantiPasswordScreen() {
  const router = useRouter();
  const { userProfile, setUserProfile } = useSettings();
  const [passwordBaru, setPasswordBaru] = React.useState('');
  const [konfirmasi, setKonfirmasi] = React.useState('');
  const [showPasswordBaru, setShowPasswordBaru] = React.useState(false);
  const [showKonfirmasi, setShowKonfirmasi] = React.useState(false);

  const mismatch = konfirmasi.length > 0 && passwordBaru !== konfirmasi;
  const isValid = passwordBaru.length > 0 && konfirmasi.length > 0 && !mismatch;

  return (
    <>
      <Stack.Screen
        options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }}
      />
      <BottomSheet onClose={() => router.back()} sheetClassName="bg-orange-100">
        {(close) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1">
            <ScrollView
              contentContainerClassName="gap-[16px] px-[31px] pb-[32px] pt-[24.5px]"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Pressable onPress={close} hitSlop={8} className="flex-row items-center gap-[6px]">
                <CaretCircleLeftIcon width={24} height={24} />
                <Text className="font-inter-semibold text-[16px] text-black">Ganti Password</Text>
              </Pressable>

              <View className="gap-[16px]">
                <View className="gap-[4px]">
                  <Text className="font-inter text-[12px] text-neutral-800">Password baru</Text>
                  <View className="flex-row items-center gap-[10px] rounded-[8px] bg-white p-[10px]">
                    <Input
                      value={passwordBaru}
                      onChangeText={setPasswordBaru}
                      placeholder="Masukkan password baru"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showPasswordBaru}
                      autoCapitalize="none"
                      className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                    />
                    <Pressable onPress={() => setShowPasswordBaru((s) => !s)} hitSlop={8}>
                      <EyeIcon width={13} height={13} />
                    </Pressable>
                  </View>
                </View>

                <View className="gap-[4px]">
                  <Text className="font-inter text-[12px] text-neutral-800">
                    Konfirmasi password baru
                  </Text>
                  <View
                    className={cn(
                      'flex-row items-center gap-[10px] rounded-[8px] bg-white p-[10px]',
                      mismatch ? 'border-2 border-red-500' : ''
                    )}>
                    <Input
                      value={konfirmasi}
                      onChangeText={setKonfirmasi}
                      placeholder="Konfirmasi password baru"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showKonfirmasi}
                      autoCapitalize="none"
                      className={cn(
                        'h-auto flex-1 border-0 bg-transparent p-0 text-[12px] shadow-none',
                        mismatch ? 'text-red-500' : 'text-neutral-800'
                      )}
                    />
                    <Pressable onPress={() => setShowKonfirmasi((s) => !s)} hitSlop={8}>
                      <EyeIcon width={13} height={13} />
                    </Pressable>
                  </View>
                  {mismatch ? (
                    <Text className="font-inter-semibold text-[10px] text-red-500">
                      Password tidak sama
                    </Text>
                  ) : null}
                </View>
              </View>

              <Pressable
                onPress={() => {
                  if (!isValid) return;
                  setUserProfile({ ...userProfile, password: passwordBaru });
                  close();
                }}
                disabled={!isValid}
                accessibilityRole="button"
                accessibilityState={{ disabled: !isValid }}
                className={cn(
                  'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                  isValid ? 'bg-orange-500' : 'bg-orange-200'
                )}>
                <Text
                  className={cn(
                    'font-inter-semibold text-[14px]',
                    isValid ? 'text-orange-50' : 'text-orange-300'
                  )}>
                  Simpan
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </BottomSheet>
    </>
  );
}
