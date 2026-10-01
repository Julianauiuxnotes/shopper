import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useSettings } from '@/lib/settings-store';
import { cn } from '@/lib/utils';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

// No Figma design exists for this screen yet — built using the same
// visual language already established across the app (input pattern
// matches other screens' bordered fields, header matches Buka Event
// Jastip/Tambah Pesanan, button matches every other form's
// disabled/enabled pair) rather than inventing a new look.
//
// Reached from Dashboard's menu icon (was previously unwired — a
// dead-end Pressable with no onPress).
//
// "Data Akun" is new: editable Nama / Nama Jastip / Email, sourced from
// the same fields captured at Sign Up (lib/settings-store's userProfile,
// written by app/sign-up.tsx on submit). Editing them here just updates
// the local store — there's no real Supabase auth wired up yet (see
// sign-up.tsx's TODO), so this doesn't re-authenticate or change a real
// account, only the local profile the rest of the app reads from.
// Password is deliberately its OWN section, not an inline editable field
// here — it opens the "Ganti password" bottom sheet (app/ganti-password.tsx)
// instead, which has its own confirm-match flow.
export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile, setUserProfile } = useSettings();

  const [namaDraft, setNamaDraft] = React.useState(userProfile.nama);
  const [namaJastipDraft, setNamaJastipDraft] = React.useState(userProfile.namaJastip);
  const [emailDraft, setEmailDraft] = React.useState(userProfile.email);
  const [justSaved, setJustSaved] = React.useState(false);

  const isValid =
    namaDraft.trim().length > 0 &&
    namaJastipDraft.trim().length > 0 &&
    emailDraft.trim().length > 0;

  const isDirty =
    namaDraft !== userProfile.nama ||
    namaJastipDraft !== userProfile.namaJastip ||
    emailDraft !== userProfile.email;

  function handleSave() {
    if (!isValid) return;
    setUserProfile({
      ...userProfile,
      nama: namaDraft.trim(),
      namaJastip: namaJastipDraft.trim(),
      email: emailDraft.trim(),
    });
    setJustSaved(true);
  }

  function withDirtyReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setJustSaved(false);
    };
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-[20px] px-[20px] pb-[40px] pt-[20px]"
        keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="flex-row items-center gap-[5px]">
          <CaretCircleLeftIcon width={24} height={24} />
          <Text className="font-inter-bold text-[16px] text-[#5d5d5d]">Pengaturan</Text>
        </Pressable>

        <View className="gap-[16px]">
          <Text className="font-inter-bold text-[14px] text-neutral-800">Data Akun</Text>

          <View className="gap-[4px]">
            <Text className="font-inter-bold text-[12px] text-neutral-800">Nama</Text>
            <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Input
                value={namaDraft}
                onChangeText={withDirtyReset(setNamaDraft)}
                placeholder="Nama Lengkap"
                placeholderTextColor="#9ca3af"
                className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
          </View>

          <View className="gap-[4px]">
            <Text className="font-inter-bold text-[12px] text-neutral-800">Nama Jastip</Text>
            <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Input
                value={namaJastipDraft}
                onChangeText={withDirtyReset(setNamaJastipDraft)}
                placeholder="Nama Jastip"
                placeholderTextColor="#9ca3af"
                className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
          </View>

          <View className="gap-[4px]">
            <Text className="font-inter-bold text-[12px] text-neutral-800">Email</Text>
            <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Input
                value={emailDraft}
                onChangeText={withDirtyReset(setEmailDraft)}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
          </View>
        </View>

        <View className="gap-[4px]">
          <Text className="font-inter-bold text-[12px] text-neutral-800">Password</Text>
          <View className="flex-row items-center justify-between rounded-[8px] border border-neutral-400 bg-white p-[10px]">
            <Text className="font-inter text-[12px] text-neutral-800">
              {'•'.repeat(Math.min(userProfile.password.length || 8, 12))}
            </Text>
            <Link href="/ganti-password" asChild>
              <Pressable hitSlop={8}>
                <Text className="font-inter-semibold text-[12px] text-orange-500 underline">
                  Ganti password
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <Pressable
          onPress={handleSave}
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

        {justSaved && !isDirty ? (
          <Text className="text-center font-inter text-[12px] text-orange-500">✓ Tersimpan</Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
