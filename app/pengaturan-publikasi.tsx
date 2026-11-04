import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { BankAccountsSheet } from '@/components/bank-account-sheets';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { AuthError, MAX_BANK_ACCOUNTS, useAuth } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';
import { useSettings } from '@/lib/settings-store';
import { cn } from '@/lib/utils';
import { useAutoReset } from '@/lib/use-auto-reset';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';

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
  link: 'https://www.justipers.app/jastiper-order-form/DRM-0110001',
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
//
// Two sections, each saved on its own (2026-11-04): the admin WhatsApp
// number, and "Pengaturan Publikasi Form Order" (the opening sentence and
// its preview), edited in a bottom sheet opened from its "Edit" button,
// like Tambah anggota and Beli token. Then "Pengaturan Publikasi
// No.rekening": the bank accounts printed on customers' bills, edited the
// same way (components/bank-account-sheets.tsx).

type SaveState = { saving: boolean; justSaved: boolean; error: string | null };
const IDLE: SaveState = { saving: false, justSaved: false, error: null };

// The orange Simpan button every form here uses, with its "✓ Tersimpan"
// and error lines underneath. `enabled` should only be true while there
// is an unsaved change, so the button greys out again right after a save.
function SaveButton({
  enabled,
  state,
  onPress,
}: {
  enabled: boolean;
  state: SaveState;
  onPress: () => void;
}) {
  const t = useT();
  // Shown for FEEDBACK_MS after each save (lib/use-auto-reset.ts).
  const [showSaved, setShowSaved] = React.useState(false);
  React.useEffect(() => setShowSaved(state.justSaved), [state.justSaved]);
  useAutoReset(showSaved, () => setShowSaved(false));

  return (
    <View className="gap-[8px]">
      <Pressable
        onPress={onPress}
        disabled={!enabled || state.saving}
        accessibilityRole="button"
        accessibilityState={{ disabled: !enabled || state.saving, busy: state.saving }}
        className={cn(
          'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
          enabled ? 'bg-orange-500' : 'bg-orange-200'
        )}>
        <Text
          className={cn(
            'font-inter-semibold text-[14px]',
            enabled ? 'text-orange-50' : 'text-orange-300'
          )}>
          {state.saving ? t('Menyimpan...') : t('Simpan')}
        </Text>
      </Pressable>
      {showSaved ? (
        <Text className="text-center font-inter text-[12px] text-orange-500">
          {t('✓ Tersimpan')}
        </Text>
      ) : null}
      {state.error ? (
        <Text className="text-center font-inter text-[12px] text-red-500">{state.error}</Text>
      ) : null}
    </View>
  );
}

export default function PengaturanPublikasiScreen() {
  const router = useRouter();
  const { adminWhatsapp, publikasiOpening, ready } = useSettings();
  const { role, shop, updateShop } = useAuth();
  const t = useT();
  // These are shop settings: only the owner may change them.
  const isOwner = role === 'owner';
  const [whatsappDraft, setWhatsappDraft] = React.useState(adminWhatsapp);
  const [whatsappSave, setWhatsappSave] = React.useState<SaveState>(IDLE);
  const [formOrderSheet, setFormOrderSheet] = React.useState(false);
  const [rekeningSheet, setRekeningSheet] = React.useState(false);
  const bankAccounts = shop?.bankAccounts ?? [];

  // See lib/settings-store.tsx's `ready` doc comment — `useState(adminWhatsapp)`
  // above only captures its initial value once, at first render, so this
  // re-syncs the drafts once the persisted values have actually loaded.
  React.useEffect(() => {
    if (!ready) return;
    setWhatsappDraft(adminWhatsapp);
  }, [ready, adminWhatsapp]);

  // Simpan is only active while a section differs from what's saved.
  const whatsappDirty = whatsappDraft.trim() !== adminWhatsapp;
  const canSaveWhatsapp = isOwner && whatsappDirty && whatsappDraft.trim().length > 0;

  // Saves one section to the server; lib/auth-store.tsx then refreshes
  // the local store.
  async function save(
    patch: { adminWhatsapp?: string; publikasiOpening?: string },
    setState: (state: SaveState) => void
  ) {
    setState({ saving: true, justSaved: false, error: null });
    try {
      await updateShop(patch);
      setState({ saving: false, justSaved: true, error: null });
    } catch (error) {
      setState({
        saving: false,
        justSaved: false,
        error:
          error instanceof AuthError
            ? error.message
            : t('Terjadi kesalahan. Coba lagi sebentar lagi.'),
      });
    }
  }

  return (
    <>
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
            <Text className="font-inter-bold text-[16px] text-[#5d5d5d]">
              {t('Pengaturan Publikasi')}
            </Text>
          </Pressable>

          <View className="gap-[4px]">
            <Text className="font-inter-bold text-[12px] text-neutral-800">
              {t('Nomor Whatsapp Admin untuk publikasi')}
            </Text>
            <Text className="font-inter text-[10px] italic text-neutral-600">
              {t(
                'Nomor ini akan digunakan untuk mengirim publikasi event jastip dan konfirmasi pesanan ke pelanggan.'
              )}
            </Text>
            <View className="flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Text className="font-inter text-[12px] text-neutral-800">+62</Text>
              <Input
                value={whatsappDraft}
                editable={isOwner}
                onChangeText={(value) => {
                  setWhatsappDraft(value);
                  setWhatsappSave(IDLE);
                }}
                placeholder="81234567890"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
          </View>

          <SaveButton
            enabled={canSaveWhatsapp}
            state={whatsappSave}
            onPress={() => save({ adminWhatsapp: whatsappDraft.trim() }, setWhatsappSave)}
          />

          <View className="h-px w-full bg-neutral-300" />

          {/* Edited in a sheet (FormOrderSheet below). Non-owners can open
              it to look, read-only. */}
          <View className="flex-row items-start justify-between gap-[10px]">
            <View className="flex-1 gap-[4px]">
              <Text className="font-inter-bold text-[14px] text-neutral-800">
                {t('Pengaturan Publikasi Form Order')}
              </Text>
              <Text className="font-inter text-[10px] italic text-neutral-600">
                {t(
                  'Atur kalimat pembuka pesan WhatsApp yang dikirim saat kamu membagikan form order event jastip, lalu lihat preview tampilannya sebelum disimpan.'
                )}
              </Text>
            </View>
            <Pressable
              onPress={() => setFormOrderSheet(true)}
              accessibilityRole="button"
              hitSlop={8}
              className="items-center justify-center rounded-[4px] border border-[#5d5d5d] bg-white px-[10px] py-[6px]">
              <Text className="font-inter text-[10px] text-black">
                {isOwner ? t('Edit') : t('Lihat')}
              </Text>
            </Pressable>
          </View>

          <View className="h-px w-full bg-neutral-300" />

          <View className="gap-[10px]">
            <View className="flex-row items-start justify-between gap-[10px]">
              <View className="flex-1 gap-[4px]">
                <Text className="font-inter-bold text-[14px] text-neutral-800">
                  {t('Pengaturan Publikasi No.rekening')}
                </Text>
                <Text className="font-inter text-[10px] italic text-neutral-600">
                  {t(
                    'Atur rekening bank yang dicetak di tagihan customer, supaya customer tahu ke mana harus transfer. Opsional, maksimal {n} rekening.',
                    { n: MAX_BANK_ACCOUNTS }
                  )}
                </Text>
              </View>
              <Pressable
                onPress={() => setRekeningSheet(true)}
                accessibilityRole="button"
                hitSlop={8}
                className="items-center justify-center rounded-[4px] border border-[#5d5d5d] bg-white px-[10px] py-[6px]">
                <Text className="font-inter text-[10px] text-black">
                  {isOwner ? t('Edit') : t('Lihat')}
                </Text>
              </Pressable>
            </View>
            {/* What's saved now, number masked: the full one is in the sheet. */}
            {bankAccounts.length > 0 ? (
              <View className="gap-[4px]">
                {bankAccounts.map((account, index) => (
                  <Text key={index} className="font-inter text-[12px] text-neutral-800">
                    {account.bank} · ••••{account.nomor.slice(-4)} ·{' '}
                    {t('a.n. {nama}', { nama: account.nama })}
                  </Text>
                ))}
              </View>
            ) : (
              <Text className="font-inter text-[12px] text-neutral-500">
                {t('Belum ada rekening.')}
              </Text>
            )}
          </View>

          {!isOwner ? (
            <Text className="text-center font-inter text-[10px] text-neutral-500">
              {t('Pengaturan publikasi hanya bisa diubah oleh pemilik toko.')}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {rekeningSheet ? <BankAccountsSheet onClose={() => setRekeningSheet(false)} /> : null}
      {formOrderSheet ? (
        <FormOrderSheet
          initialOpening={publikasiOpening}
          editable={isOwner}
          onSave={(opening) => updateShop({ publikasiOpening: opening })}
          onClose={() => setFormOrderSheet(false)}
        />
      ) : null}
    </>
  );
}

// "Pengaturan Publikasi Form Order": the opening sentence of the WhatsApp
// publication and a live preview of it, with Simpan. Closes on a
// successful save. Scrolls inside the sheet, since the preview is tall.
function FormOrderSheet({
  initialOpening,
  editable,
  onSave,
  onClose,
}: {
  initialOpening: string;
  editable: boolean;
  onSave: (opening: string) => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const { height } = useWindowDimensions();
  const [opening, setOpening] = React.useState(initialOpening);
  const [state, setState] = React.useState<SaveState>(IDLE);
  const previewOpening = opening.trim().length > 0 ? opening : t(OPENING_PLACEHOLDER);

  return (
    <BottomSheet onClose={onClose} sheetClassName="bg-orange-100">
      {(close) => {
        async function save() {
          setState({ saving: true, justSaved: false, error: null });
          try {
            await onSave(opening);
            close();
          } catch (error) {
            setState({
              saving: false,
              justSaved: false,
              error:
                error instanceof AuthError
                  ? error.message
                  : t('Terjadi kesalahan. Coba lagi sebentar lagi.'),
            });
          }
        }
        return (
          <View style={{ maxHeight: height * 0.9 }} className="gap-[16px] pb-[32px] pt-[24.5px]">
            <Pressable
              onPress={close}
              hitSlop={8}
              className="flex-row items-center gap-[6px] px-[31px]">
              <CaretCircleLeftIcon width={24} height={24} />
              <Text className="font-inter-semibold text-[16px] text-black">
                {t('Pengaturan Publikasi Form Order')}
              </Text>
            </Pressable>

            <ScrollView
              contentContainerClassName="gap-[20px] px-[31px]"
              keyboardShouldPersistTaps="handled">
              <View className="gap-[4px]">
                <Text className="font-inter-bold text-[12px] text-neutral-800">
                  {t('Format kalimat pembuka publikasi event jastip')}
                </Text>
                <View className="h-[97px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                  <Input
                    value={opening}
                    editable={editable}
                    onChangeText={(value) => {
                      setOpening(value);
                      setState(IDLE);
                    }}
                    placeholder={t(OPENING_PLACEHOLDER)}
                    placeholderTextColor="#d1d5db"
                    multiline
                    textAlignVertical="top"
                    className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                  />
                </View>
              </View>

              <View className="gap-[12px]">
                <Text className="font-inter-semibold text-[12px] text-neutral-800">
                  {t('Preview tampilan publikasi via Whatsapp:')}
                </Text>
                <View className="overflow-hidden rounded-[8px] border border-neutral-600 bg-white pb-[10px]">
                  <View className="h-[160px] w-full items-center justify-center bg-neutral-200">
                    <Text className="font-inter text-[12px] text-neutral-600">
                      {t('Foto event')}
                    </Text>
                  </View>
                  <View className="gap-[8px] px-[12px] pt-[10px]">
                    <Text className="font-inter text-[12px] text-neutral-800">
                      {previewOpening}
                    </Text>
                    <Text className="font-inter text-[12px] text-neutral-800">
                      <Text className="font-inter-bold text-[12px] text-neutral-800">
                        {t('Nama acara')}
                      </Text>
                      {`: ${SAMPLE_EVENT.namaAcara}\n`}
                      <Text className="font-inter-bold text-[12px] text-neutral-800">
                        {t('Tanggal acara:')}{' '}
                      </Text>
                      {SAMPLE_EVENT.tanggalAcara}
                      {'\n'}
                      <Text className="font-inter-bold text-[12px] text-neutral-800">
                        {t('Lokasi:')}{' '}
                      </Text>
                      {SAMPLE_EVENT.lokasi}
                    </Text>
                    <Text className="font-inter text-[12px] text-neutral-800">
                      <Text className="font-inter-bold text-[12px] text-neutral-800">
                        {t('Klik link dibawah ini untuk pemesanan:')}
                      </Text>
                      {`\n${SAMPLE_EVENT.link}`}
                    </Text>
                  </View>
                </View>
              </View>

              {editable ? (
                <SaveButton enabled={opening !== initialOpening} state={state} onPress={save} />
              ) : (
                <Text className="text-center font-inter text-[10px] text-neutral-500">
                  {t('Pengaturan publikasi hanya bisa diubah oleh pemilik toko.')}
                </Text>
              )}
            </ScrollView>
          </View>
        );
      }}
    </BottomSheet>
  );
}
