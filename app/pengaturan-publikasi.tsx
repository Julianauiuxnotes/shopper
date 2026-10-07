import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { AuthError, useAuth } from '@/lib/auth-store';
import { useSettings } from '@/lib/settings-store';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

const OPENING_PLACEHOLDER =
  'E.g: Halo semua! sebentar lagi event yang kamu tunggu-tunggu akan dimulai. Yuk catat tanggal dan harinya!';

// Sample event used only for the live preview below — this screen
// configures a message TEMPLATE, not any specific event (no event is
// selected at this point in navigation, reached straight from
// Dashboard's hamburger menu), so the preview intentionally shows
// illustrative example values rather than pretending to show a real
// jastiper's real event.
const SAMPLE_EVENT = {
  namaAcara: 'Warehouse Sales',
  tanggalAcara: '1-4 October 2026',
  lokasi: 'Bandung',
  link: 'https://www.shopper.app/jastiper-order-form/DRM-0110001',
};

// Figma node 161:377 "Pengaturan publikasi". Two corrections from the
// literal pull: (1) the header text in Figma reads "Pengaturan akun" —
// clearly copy-paste residue from the Data Akun settings screen this
// was duplicated from, so it's corrected to "Pengaturan Publikasi" to
// match this screen's actual identity and the drawer menu item that
// links here; (2) the WhatsApp number field's filled-state value reads
// "Juliana" (a name, not a number) — also a mockup content error, so
// a real numeric placeholder is used instead. The design has no Simpan
// button, but every other editable form in this app has one, so one
// was added here too for consistency rather than leaving silent/no-op
// edits. "Nomor WhatsApp Admin" moved here from Data Akun (lib/settings-
// store.tsx's existing adminWhatsapp) since this page is specifically
// about what gets published/sent to customers.
//
// The preview card's photo (Figma's `imgRectangle2`) was a real stock
// photo whose EXIF metadata carries an explicit Shutterstock "no use
// without permission" copyright notice — not bundled into this app;
// a plain placeholder box stands in for "wherever the event's own
// photo would appear" instead.
export default function PengaturanPublikasiScreen() {
  const router = useRouter();
  const { adminWhatsapp, publikasiOpening, ready } = useSettings();
  const { role, updateShop } = useAuth();
  // These are shop settings: only the owner may change them.
  const isOwner = role === 'owner';
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [whatsappDraft, setWhatsappDraft] = React.useState(adminWhatsapp);
  const [openingDraft, setOpeningDraft] = React.useState(publikasiOpening);
  const [justSaved, setJustSaved] = React.useState(false);

  // See lib/settings-store.tsx's `ready` doc comment — `useState(adminWhatsapp)`
  // above only captures its initial value once, at first render, so this
  // re-syncs the drafts once the persisted values have actually loaded.
  React.useEffect(() => {
    if (!ready) return;
    setWhatsappDraft(adminWhatsapp);
    setOpeningDraft(publikasiOpening);
  }, [ready, adminWhatsapp, publikasiOpening]);

  const isValid = isOwner && whatsappDraft.trim().length > 0;
  const isDirty = whatsappDraft !== adminWhatsapp || openingDraft !== publikasiOpening;

  // Saves to the server; lib/auth-store.tsx then refreshes the local store.
  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateShop({ adminWhatsapp: whatsappDraft.trim(), publikasiOpening: openingDraft });
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

  const previewOpening = openingDraft.trim().length > 0 ? openingDraft : OPENING_PLACEHOLDER;

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
          <Text className="font-inter-bold text-[16px] text-[#5d5d5d]">Pengaturan Publikasi</Text>
        </Pressable>

        <View className="gap-[4px]">
          <Text className="font-inter-bold text-[12px] text-neutral-800">Nomor WhatsApp Admin</Text>
          <View className="flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
            <Text className="font-inter text-[12px] text-neutral-800">+62</Text>
            <Input
              value={whatsappDraft}
              onChangeText={withDirtyReset(setWhatsappDraft)}
              placeholder="81234567890"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
            />
          </View>
          <Text className="font-inter text-[10px] italic text-neutral-600">
            Nomor ini akan digunakan untuk mengirim publikasi event jastip dan konfirmasi pesanan ke
            pelanggan.
          </Text>
        </View>

        <View className="gap-[4px]">
          <Text className="font-inter-bold text-[12px] text-neutral-800">
            Format kalimat pembuka publikasi event jastip
          </Text>
          <View className="h-[97px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
            <Input
              value={openingDraft}
              onChangeText={withDirtyReset(setOpeningDraft)}
              placeholder={OPENING_PLACEHOLDER}
              placeholderTextColor="#d1d5db"
              multiline
              textAlignVertical="top"
              className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
            />
          </View>
        </View>

        <View className="gap-[12px]">
          <Text className="font-inter-semibold text-[12px] text-neutral-800">
            Preview tampilan publikasi via Whatsapp:
          </Text>
          <View className="overflow-hidden rounded-[8px] border border-neutral-600 bg-white pb-[10px]">
            <View className="h-[160px] w-full items-center justify-center bg-neutral-200">
              <Text className="font-inter text-[12px] text-neutral-600">Foto event</Text>
            </View>
            <View className="gap-[8px] px-[12px] pt-[10px]">
              <Text className="font-inter text-[12px] text-neutral-800">{previewOpening}</Text>
              <Text className="font-inter text-[12px] text-neutral-800">
                <Text className="font-inter-bold text-[12px] text-neutral-800">Nama acara</Text>
                {`: ${SAMPLE_EVENT.namaAcara}\n`}
                <Text className="font-inter-bold text-[12px] text-neutral-800">
                  Tanggal acara:{' '}
                </Text>
                {SAMPLE_EVENT.tanggalAcara}
                {'\n'}
                <Text className="font-inter-bold text-[12px] text-neutral-800">Lokasi: </Text>
                {SAMPLE_EVENT.lokasi}
              </Text>
              <Text className="font-inter text-[12px] text-neutral-800">
                <Text className="font-inter-bold text-[12px] text-neutral-800">
                  Klik link dibawah ini untuk pemesanan:
                </Text>
                {`\n${SAMPLE_EVENT.link}`}
              </Text>
            </View>
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
            Pengaturan publikasi hanya bisa diubah oleh pemilik toko.
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
