import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { compressLogo } from '@/lib/compress-image';
import { TeamSection } from '@/components/team-section';
import { AuthError, useAuth } from '@/lib/auth-store';
import { useSettings } from '@/lib/settings-store';
import { cn } from '@/lib/utils';
import * as ImagePicker from 'expo-image-picker';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

// Logo upload limits. The logo's slot on printed output is 101x47
// (components/jastiper-logo.tsx): 300x140 px keeps it sharp on a 3x
// phone screen, and 600x280 px leaves headroom for a paper printout.
// The size cap matters because the logo is stored on-device as a base64
// `data:` URI (lib/settings-store.tsx) — 500 KB becomes ~670 KB of
// text, comfortably under Android AsyncStorage's 2 MB-per-entry limit.
const LOGO_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const LOGO_MIN_WIDTH = 300;
const LOGO_MIN_HEIGHT = 140;
// Picked files are compressed to ~200 KB before storing; this only stops
// absurdly large inputs from being loaded into memory at all.
const LOGO_MAX_INPUT_BYTES = 10 * 1024 * 1024;
// A complex PNG can stay above the 200 KB target even at the smallest
// size; this is the hard ceiling (see the AsyncStorage note above).
const LOGO_MAX_STORED_BYTES = 500 * 1024;

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
  const { userProfile, logoJastip, setLogoJastip, ready } = useSettings();
  const { role, updateShop, updateMyName } = useAuth();
  // Shop settings (shop name, phone, logo) are the owner's to change; an
  // invited member can only edit their own name.
  const isOwner = role === 'owner';
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [logoError, setLogoError] = React.useState<string | null>(null);

  // Saves straight to the store on pick (no Simpan step), like the photo
  // fields elsewhere. Errors show inline: Alert.alert is a no-op on web.
  async function handlePickLogo() {
    setLogoError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setLogoError('Aktifkan akses foto di pengaturan perangkat untuk memilih logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    if (!LOGO_MIME_TYPES.includes(mimeType)) {
      setLogoError('Format tidak didukung. Pilih gambar PNG atau JPG.');
      return;
    }
    if (asset.width < LOGO_MIN_WIDTH || asset.height < LOGO_MIN_HEIGHT) {
      setLogoError(
        `Gambar terlalu kecil (${asset.width} x ${asset.height} px). Minimal ${LOGO_MIN_WIDTH} x ${LOGO_MIN_HEIGHT} px.`
      );
      return;
    }
    if ((asset.fileSize ?? 0) > LOGO_MAX_INPUT_BYTES) {
      setLogoError(
        `Ukuran file terlalu besar (${Math.round((asset.fileSize ?? 0) / 1024 / 1024)} MB). Maksimal ${LOGO_MAX_INPUT_BYTES / 1024 / 1024} MB.`
      );
      return;
    }
    // Shrunk to ~200 KB (lib/compress-image.ts), then kept as a data: URI
    // so it survives a reload (see lib/settings-store.tsx).
    try {
      const compressed = await compressLogo(asset, mimeType === 'image/png');
      if (!compressed.base64 || compressed.bytes > LOGO_MAX_STORED_BYTES) {
        setLogoError('Logo terlalu besar untuk disimpan. Coba gambar yang lebih sederhana.');
        return;
      }
      setLogoJastip(`data:${compressed.mimeType};base64,${compressed.base64}`);
    } catch {
      setLogoError('Logo tidak berhasil dibaca. Coba pilih gambar lain.');
    }
  }

  const [namaDraft, setNamaDraft] = React.useState(userProfile.nama);
  const [namaJastipDraft, setNamaJastipDraft] = React.useState(userProfile.namaJastip);
  const [emailDraft, setEmailDraft] = React.useState(userProfile.email);
  const [teleponDraft, setTeleponDraft] = React.useState(userProfile.telepon ?? '');
  const [justSaved, setJustSaved] = React.useState(false);

  // `useState(userProfile.nama)` above only reads its initial value once,
  // at this component's first render — if that happens before the
  // store's persisted profile finishes loading (see lib/settings-store.tsx),
  // these drafts would otherwise permanently lock in the pre-load empty
  // strings. Re-syncs when loading completes, and again whenever the
  // profile itself changes (it is refreshed from the server after login
  // and after each save, see lib/auth-store.tsx).
  React.useEffect(() => {
    if (!ready) return;
    setNamaDraft(userProfile.nama);
    setNamaJastipDraft(userProfile.namaJastip);
    setEmailDraft(userProfile.email);
    setTeleponDraft(userProfile.telepon ?? '');
  }, [ready, userProfile.nama, userProfile.namaJastip, userProfile.email, userProfile.telepon]);

  const isValid =
    namaDraft.trim().length > 0 &&
    namaJastipDraft.trim().length > 0 &&
    emailDraft.trim().length > 0;

  const isDirty =
    namaDraft !== userProfile.nama ||
    namaJastipDraft !== userProfile.namaJastip ||
    emailDraft !== userProfile.email ||
    teleponDraft !== (userProfile.telepon ?? '');

  // Saves to the server; lib/auth-store.tsx then refreshes the local
  // store from it. Needs a connection until offline saving arrives with
  // step 2 of the sync plan.
  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (namaDraft.trim() !== userProfile.nama) await updateMyName(namaDraft.trim());
      if (isOwner) await updateShop({ name: namaJastipDraft.trim(), telepon: teleponDraft });
      setJustSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof AuthError ? error.message : 'Terjadi kesalahan. Coba lagi sebentar lagi.'
      );
    } finally {
      setSaving(false);
    }
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

          <View className="gap-[8px]">
            <Text className="font-inter-bold text-[12px] text-neutral-800">Logo Jastip</Text>
            <View className="flex-row items-center gap-[12px]">
              {/* Same 101:47 proportions as the logo's slot on printouts. */}
              <View className="h-[70px] w-[150px] items-center justify-center overflow-hidden rounded-[8px] border border-dashed border-neutral-400 bg-neutral-50">
                {logoJastip ? (
                  <Image
                    source={{ uri: logoJastip }}
                    resizeMode="contain"
                    style={{ width: 150, height: 70 }}
                    accessibilityLabel="Logo jastip"
                  />
                ) : (
                  <Text className="font-inter text-[10px] text-neutral-500">Belum ada logo</Text>
                )}
              </View>
              <View className="items-start gap-[8px]">
                <Pressable
                  onPress={handlePickLogo}
                  accessibilityRole="button"
                  className="rounded-[8px] border border-orange-400 bg-orange-50 p-[10px]">
                  <Text className="font-inter text-[12px] text-orange-500">
                    {logoJastip ? 'Ganti logo' : 'Unggah logo'}
                  </Text>
                </Pressable>
                {logoJastip ? (
                  <Pressable
                    onPress={() => {
                      setLogoError(null);
                      setLogoJastip(null);
                    }}
                    accessibilityRole="button"
                    hitSlop={8}>
                    <Text className="font-inter-semibold text-[12px] text-red-500 underline">
                      Hapus logo
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <Text className="font-inter text-[10px] text-neutral-500">
              PNG atau JPG, mendatar (rasio sekitar 2:1). Minimal {LOGO_MIN_WIDTH} x{' '}
              {LOGO_MIN_HEIGHT} px, disarankan 600 x 280 px. Gambar dikompres otomatis ke sekitar
              200 KB.
            </Text>
            {logoError ? (
              <Text className="font-inter text-[10px] text-red-500">{logoError}</Text>
            ) : null}
          </View>

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
                editable={isOwner}
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
                // The login email; changing it needs an email-confirmation
                // flow that doesn't exist yet.
                editable={false}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
          </View>
        </View>

        {/* Optional (not part of isValid). Shown on the tagihan receipt
            under the jastiper's name. Same "+62" prefix pattern as
            Pengaturan Publikasi's admin WhatsApp field. */}
        <View className="gap-[4px]">
          <Text className="font-inter-bold text-[12px] text-neutral-800">No. Telepon Jastip</Text>
          <View className="flex-row items-center gap-[10px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
            <Text className="font-inter text-[12px] text-neutral-400">+62</Text>
            <Input
              value={teleponDraft}
              editable={isOwner}
              onChangeText={withDirtyReset((value: string) =>
                setTeleponDraft(value.replace(/\D/g, '').replace(/^0+/, ''))
              )}
              placeholder="81234567890"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
            />
          </View>
          <Text className="font-inter text-[10px] text-neutral-500">
            Ditampilkan di tagihan customer, di bawah nama jastip.
          </Text>
        </View>

        <View className="gap-[4px]">
          <Text className="font-inter-bold text-[12px] text-neutral-800">Password</Text>
          <View className="flex-row items-center justify-between rounded-[8px] border border-neutral-400 bg-white p-[10px]">
            <Text className="font-inter text-[12px] text-neutral-800">{'•'.repeat(8)}</Text>
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
          disabled={!isValid || saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid || saving, busy: saving }}
          className={cn(
            'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
            isValid ? 'bg-orange-500' : 'bg-orange-200'
          )}>
          <Text
            className={cn(
              'font-inter-semibold text-[14px]',
              isValid ? 'text-orange-50' : 'text-orange-300'
            )}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Text>
        </Pressable>

        {justSaved && !isDirty ? (
          <Text className="text-center font-inter text-[12px] text-orange-500">✓ Tersimpan</Text>
        ) : null}
        {saveError ? (
          <Text className="text-center font-inter text-[12px] text-red-500">{saveError}</Text>
        ) : null}
        {!isOwner ? (
          <Text className="text-center font-inter text-[10px] text-neutral-500">
            Nama jastip dan nomor telepon hanya bisa diubah oleh pemilik toko.
          </Text>
        ) : null}

        <View className="h-px w-full bg-neutral-300" />
        <TeamSection />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
