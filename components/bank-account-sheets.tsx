import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import CaretDownIcon from '@/assets/images/figma/icon-caret-down.svg';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { type BankAccount, MAX_BANK_ACCOUNTS, useAuth } from '@/lib/auth-store';
import { BANKS, E_WALLETS, isListedBank } from '@/lib/banks';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

// Bank accounts, from Pengaturan Publikasi's "Pengaturan Publikasi
// No.rekening" section (app/pengaturan-publikasi.tsx):
// - BankAccountsSheet: the accounts themselves, up to MAX_BANK_ACCOUNTS;
// - BankPrivacySheet: the privacy notice, shown before the first account
//   is added (and readable again from the section);
// - ConfirmPasswordSheet: the password check every change needs
//   (enforced on the server, supabase/functions/shop-bank-accounts);
// - BankPickerSheet: "Pilih bank", the list behind each account's bank
//   field (lib/banks.ts), with "Lainnya" for typing any other name.

// `custom`: "Lainnya" was picked, so the bank name is typed in. Only kept
// while editing; never saved.
type DraftAccount = BankAccount & { custom?: boolean };

const EMPTY_ACCOUNT: DraftAccount = { bank: '', nomor: '', nama: '' };

function toDraft(account: BankAccount): DraftAccount {
  return { ...account, custom: account.bank !== '' && !isListedBank(account.bank) };
}

function sameAccounts(a: BankAccount[], b: BankAccount[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// A bank account counts once anything is typed in it; then all three
// fields are needed. Entirely empty rows are dropped on save.
function accountProblem(account: BankAccount) {
  const bank = account.bank.trim();
  const nama = account.nama.trim();
  if (!bank && !account.nomor && !nama) return null;
  if (!bank || !account.nomor || !nama) return 'incomplete';
  if (account.nomor.length < 5) return 'short';
  return null;
}

/**
 * The shop's bank accounts, printed on customers' bills while unpaid.
 * Owners edit; others see them read-only. Simpan asks for the password
 * (ConfirmPasswordSheet, stacked on top), and the first account added
 * shows the privacy notice first.
 */
function BankAccountsSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { height } = useWindowDimensions();
  const { role, shop, saveBankAccounts } = useAuth();
  const isOwner = role === 'owner';
  const saved = shop?.bankAccounts ?? [];
  const [draft, setDraft] = React.useState<DraftAccount[]>(() => saved.map(toDraft));
  const [consentGiven, setConsentGiven] = React.useState(false);
  const [step, setStep] = React.useState<
    'privacy' | 'privacyRead' | 'password' | { pickBankFor: number } | null
  >(null);
  const closeRef = React.useRef<() => void>(onClose);

  const problems = draft.map(accountProblem);
  const cleaned = draft
    .map((a) => ({ bank: a.bank.trim(), nomor: a.nomor, nama: a.nama.trim() }))
    .filter((a) => a.bank || a.nomor || a.nama);
  const canSave = isOwner && problems.every((p) => p === null) && !sameAccounts(cleaned, saved);

  function edit(index: number, patch: Partial<DraftAccount>) {
    setDraft((accounts) => accounts.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function add() {
    // The privacy notice comes first, once per shop.
    if (!shop?.bankConsentAt && !consentGiven) {
      setStep('privacy');
      return;
    }
    setDraft((accounts) => [...accounts, EMPTY_ACCOUNT]);
  }

  return (
    <>
      <BottomSheet onClose={onClose} sheetClassName="bg-orange-100">
        {(close) => {
          closeRef.current = close;
          return (
            <View style={{ maxHeight: height * 0.9 }} className="gap-[16px] pb-[32px] pt-[24.5px]">
              <Pressable
                onPress={close}
                hitSlop={8}
                className="flex-row items-center gap-[6px] px-[31px]">
                <CaretCircleLeftIcon width={24} height={24} />
                <Text className="font-inter-semibold text-[16px] text-black">
                  {t('Pengaturan Publikasi No.rekening')}
                </Text>
              </Pressable>

              <ScrollView
                contentContainerClassName="gap-[12px] px-[31px]"
                keyboardShouldPersistTaps="handled">
                <View className="gap-[2px]">
                  <Text className="font-inter text-[10px] text-neutral-600">
                    {t(
                      'Ditampilkan di tagihan customer yang belum lunas, supaya customer tahu ke mana harus transfer. Maksimal {n} rekening.',
                      { n: MAX_BANK_ACCOUNTS }
                    )}
                  </Text>
                  <Pressable
                    onPress={() => setStep('privacyRead')}
                    hitSlop={8}
                    className="self-start">
                    <Text className="font-inter-semibold text-[10px] text-orange-500 underline">
                      {t('Kebijakan privasi rekening')}
                    </Text>
                  </Pressable>
                </View>

                {draft.length === 0 ? (
                  <Text className="font-inter text-[12px] text-neutral-500">
                    {t('Belum ada rekening.')}
                  </Text>
                ) : null}

                {draft.map((account, index) => (
                  <View
                    key={index}
                    className="gap-[8px] rounded-[8px] border border-neutral-300 bg-white p-[10px]">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-inter-semibold text-[12px] text-neutral-800">
                        {t('Rekening {n}', { n: index + 1 })}
                      </Text>
                      {isOwner ? (
                        <Pressable
                          onPress={() =>
                            setDraft((accounts) => accounts.filter((_, i) => i !== index))
                          }
                          hitSlop={8}
                          accessibilityRole="button">
                          <Text className="font-inter-semibold text-[12px] text-red-500 underline">
                            {t('Hapus')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => setStep({ pickBankFor: index })}
                      disabled={!isOwner}
                      accessibilityRole="button"
                      accessibilityLabel={t('Pilih bank')}
                      className="flex-row items-center justify-between gap-[8px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Text
                        className={cn(
                          'flex-1 font-inter text-[12px]',
                          account.bank || account.custom ? 'text-neutral-800' : 'text-neutral-400'
                        )}>
                        {account.custom ? t('Lainnya') : account.bank || t('Pilih bank')}
                      </Text>
                      {isOwner ? <CaretDownIcon width={15} height={15} /> : null}
                    </Pressable>
                    {account.custom ? (
                      <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                        <Input
                          value={account.bank}
                          editable={isOwner}
                          onChangeText={(value) => edit(index, { bank: value.slice(0, 40) })}
                          placeholder={t('Tulis nama bank')}
                          placeholderTextColor="#9ca3af"
                          className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                        />
                      </View>
                    ) : null}
                    <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Input
                        value={account.nomor}
                        editable={isOwner}
                        onChangeText={(value) =>
                          edit(index, { nomor: value.replace(/\D/g, '').slice(0, 20) })
                        }
                        placeholder={t('No. Rekening')}
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                        className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                    <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Input
                        value={account.nama}
                        editable={isOwner}
                        onChangeText={(value) => edit(index, { nama: value.slice(0, 60) })}
                        placeholder={t('Nama pemilik rekening')}
                        placeholderTextColor="#9ca3af"
                        className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                    {problems[index] === 'incomplete' ? (
                      <Text className="font-inter text-[10px] text-red-500">
                        {t('Lengkapi nama bank, nomor rekening, dan nama pemilik.')}
                      </Text>
                    ) : problems[index] === 'short' ? (
                      <Text className="font-inter text-[10px] text-red-500">
                        {t('Nomor rekening terlalu pendek.')}
                      </Text>
                    ) : null}
                  </View>
                ))}

                {isOwner && draft.length < MAX_BANK_ACCOUNTS ? (
                  <Pressable
                    onPress={add}
                    accessibilityRole="button"
                    className="items-center rounded-[8px] border border-orange-400 bg-orange-50 p-[10px]">
                    <Text className="font-inter-semibold text-[12px] text-orange-500">
                      {t('+ Tambah rekening')}
                    </Text>
                  </Pressable>
                ) : null}

                {isOwner ? (
                  <Pressable
                    onPress={() => setStep('password')}
                    disabled={!canSave}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSave }}
                    className={cn(
                      'mt-[8px] w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                      canSave ? 'bg-orange-500' : 'bg-orange-200'
                    )}>
                    <Text
                      className={cn(
                        'font-inter-semibold text-[14px]',
                        canSave ? 'text-orange-50' : 'text-orange-300'
                      )}>
                      {t('Simpan')}
                    </Text>
                  </Pressable>
                ) : (
                  <Text className="text-center font-inter text-[10px] text-neutral-500">
                    {t('Rekening hanya bisa diubah oleh pemilik toko.')}
                  </Text>
                )}
              </ScrollView>
            </View>
          );
        }}
      </BottomSheet>

      {step === 'privacy' ? (
        <BankPrivacySheet
          onClose={() => setStep(null)}
          onAccept={() => {
            setConsentGiven(true);
            setDraft((accounts) => [...accounts, EMPTY_ACCOUNT]);
          }}
        />
      ) : null}
      {step === 'privacyRead' ? <BankPrivacySheet onClose={() => setStep(null)} /> : null}
      {typeof step === 'object' && step !== null ? (
        <BankPickerSheet
          current={draft[step.pickBankFor]?.custom ? null : (draft[step.pickBankFor]?.bank ?? '')}
          onClose={() => setStep(null)}
          onPick={(bank) =>
            edit(
              step.pickBankFor,
              bank === null ? { bank: '', custom: true } : { bank, custom: false }
            )
          }
        />
      ) : null}
      {step === 'password' ? (
        <ConfirmPasswordSheet
          onClose={() => setStep(null)}
          onConfirm={async (password) => {
            await saveBankAccounts(cleaned, password, consentGiven);
            // Saved: this sheet goes too, once the password sheet has.
            setTimeout(() => closeRef.current(), 0);
          }}
        />
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-[4px]">
      <Text className="font-inter-bold text-[12px] text-neutral-800">{title}</Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <Text className="font-inter text-[12px] leading-[18px] text-neutral-700">{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row gap-[6px]">
      <Text className="font-inter text-[12px] text-neutral-700">•</Text>
      <View className="flex-1">
        <Body>{children}</Body>
      </View>
    </View>
  );
}

/** `onAccept` set: the first time, with a consent checkbox. Unset: read-only. */
function BankPrivacySheet({ onClose, onAccept }: { onClose: () => void; onAccept?: () => void }) {
  const t = useT();
  const [agreed, setAgreed] = React.useState(false);

  return (
    <BottomSheet onClose={onClose} sheetClassName="bg-white">
      {(close) => (
        <View className="max-h-[85vh] gap-[16px] px-[24px] pb-[28px] pt-[24px]">
          <Pressable onPress={close} hitSlop={8} className="flex-row items-center gap-[6px]">
            <CaretCircleLeftIcon width={24} height={24} />
            <Text className="font-inter-semibold text-[16px] text-black">
              {t('Kebijakan Privasi Rekening Bank')}
            </Text>
          </Pressable>

          <ScrollView contentContainerClassName="gap-[14px]" showsVerticalScrollIndicator>
            <Section title={t('Untuk apa data ini dipakai')}>
              <Body>
                {t(
                  'Nama bank, nomor rekening, dan nama pemilik rekening hanya dipakai untuk dicetak di tagihan yang kamu kirim ke customer, supaya customer tahu ke mana harus transfer.'
                )}
              </Body>
            </Section>

            <Section title={t('Tidak dipakai untuk hal lain')}>
              <Body>
                {t(
                  'Justipers tidak memakai data rekeningmu untuk tujuan lain apa pun, tidak menjual atau membagikannya ke pihak lain, dan tidak pernah menarik, menerima, atau memindahkan uang dari rekening ini. Pembayaran customer langsung masuk ke rekeningmu.'
                )}
              </Body>
            </Section>

            <Section title={t('Opsional, keputusanmu sendiri')}>
              <Body>
                {t(
                  'Mengisi rekening bukan langkah wajib di Justipers. Semua fitur tetap bisa dipakai tanpa rekening. Karena mencantumkan rekening adalah pilihanmu sendiri, Justipers tidak bertanggung jawab atas akibat dari keputusanmu mencantumkan dan membagikan rekening melalui tagihan, misalnya bila tagihan diteruskan ke orang lain.'
                )}
              </Body>
            </Section>

            <Section title={t('Cara Justipers melindungi data ini')}>
              <Bullet>
                {t(
                  'Hanya pemilik toko yang bisa menambah, mengubah, atau menghapus rekening, dan setiap perubahan harus dikonfirmasi dengan password.'
                )}
              </Bullet>
              <Bullet>
                {t(
                  'Data disimpan terenkripsi di server Justipers dan hanya bisa dibaca oleh anggota tokomu.'
                )}
              </Bullet>
              <Bullet>
                {t(
                  'Kamu bisa menghapus rekening kapan saja di Pengaturan Publikasi. Data rekening ikut terhapus bila akunmu dihapus.'
                )}
              </Bullet>
              <Bullet>
                {t(
                  'Tagihan yang sudah dikirim tetap menampilkan rekening yang berlaku saat tagihan dibuat.'
                )}
              </Bullet>
            </Section>
          </ScrollView>

          {onAccept ? (
            <>
              <Pressable
                onPress={() => setAgreed((a) => !a)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
                aria-checked={agreed}
                className="flex-row items-start gap-[8px]">
                <View
                  className={cn(
                    'mt-[1px] h-[16px] w-[16px] items-center justify-center rounded-[4px] border',
                    agreed ? 'border-orange-500 bg-orange-500' : 'border-neutral-400 bg-white'
                  )}>
                  {agreed ? <Text className="text-[10px] leading-[12px] text-white">✓</Text> : null}
                </View>
                <Text className="flex-1 font-inter text-[12px] text-neutral-800">
                  {t('Saya sudah membaca dan menyetujui kebijakan ini.')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onAccept();
                  close();
                }}
                disabled={!agreed}
                accessibilityRole="button"
                accessibilityState={{ disabled: !agreed }}
                className={cn(
                  'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                  agreed ? 'bg-orange-500' : 'bg-orange-200'
                )}>
                <Text
                  className={cn(
                    'font-inter-semibold text-[14px]',
                    agreed ? 'text-white' : 'text-orange-300'
                  )}>
                  {t('Setuju dan lanjutkan')}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={close}
              accessibilityRole="button"
              className="w-full items-center justify-center rounded-[12px] bg-orange-500 px-[10px] py-[16px]">
              <Text className="font-inter-semibold text-[14px] text-white">{t('Tutup')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

/** Asks for the password; `onConfirm` saves and throws an Error to show. */
function ConfirmPasswordSheet({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}) {
  const t = useT();
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <BottomSheet onClose={onClose} sheetClassName="bg-white">
      {(close) => {
        async function confirm() {
          if (!password || busy) return;
          setBusy(true);
          setError(null);
          try {
            await onConfirm(password);
            close();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : t('Terjadi kesalahan. Coba lagi sebentar lagi.')
            );
            setBusy(false);
          }
        }
        return (
          <View className="gap-[16px] px-[24px] pb-[28px] pt-[24px]">
            <Pressable onPress={close} hitSlop={8} className="flex-row items-center gap-[6px]">
              <CaretCircleLeftIcon width={24} height={24} />
              <Text className="font-inter-semibold text-[16px] text-black">
                {t('Konfirmasi password')}
              </Text>
            </Pressable>
            <Text className="font-inter text-[12px] text-neutral-700">
              {t(
                'Demi keamanan, masukkan password Justipers kamu untuk menyimpan perubahan rekening.'
              )}
            </Text>
            <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Input
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={confirm}
                secureTextEntry
                autoFocus
                placeholder={t('Password')}
                placeholderTextColor="#9ca3af"
                className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
            {error ? <Text className="font-inter text-[12px] text-red-500">{error}</Text> : null}
            <Pressable
              onPress={confirm}
              disabled={!password || busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: !password || busy }}
              className={cn(
                'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                password && !busy ? 'bg-orange-500' : 'bg-orange-200'
              )}>
              <Text
                className={cn(
                  'font-inter-semibold text-[14px]',
                  password && !busy ? 'text-white' : 'text-orange-300'
                )}>
                {busy ? t('Menyimpan...') : t('Konfirmasi dan simpan')}
              </Text>
            </Pressable>
          </View>
        );
      }}
    </BottomSheet>
  );
}

/**
 * "Pilih bank": banks and e-wallets from lib/banks.ts, searchable, plus
 * "Lainnya". `onPick(null)` means Lainnya (type the name in yourself).
 */
function BankPickerSheet({
  current,
  onPick,
  onClose,
}: {
  current: string | null;
  onPick: (bank: string | null) => void;
  onClose: () => void;
}) {
  const t = useT();
  const { height } = useWindowDimensions();
  const [query, setQuery] = React.useState('');
  const q = query.trim().toLowerCase();
  const match = (name: string) => !q || name.toLowerCase().includes(q);
  const banks = BANKS.filter(match);
  const wallets = E_WALLETS.filter(match);

  return (
    <BottomSheet onClose={onClose} sheetClassName="bg-white">
      {(close) => {
        function pick(bank: string | null) {
          onPick(bank);
          close();
        }
        function Option({ name }: { name: string }) {
          const selected = current === name;
          return (
            <Pressable
              onPress={() => pick(name)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              className="flex-row items-center justify-between border-b border-neutral-200 py-[12px]">
              <Text
                className={cn(
                  'font-inter text-[14px]',
                  selected ? 'font-inter-semibold text-orange-500' : 'text-neutral-800'
                )}>
                {name}
              </Text>
              {selected ? (
                <Text className="font-inter-bold text-[14px] text-orange-500">✓</Text>
              ) : null}
            </Pressable>
          );
        }
        return (
          <View style={{ maxHeight: height * 0.85 }} className="gap-[12px] pb-[24px] pt-[24px]">
            <Pressable
              onPress={close}
              hitSlop={8}
              className="flex-row items-center gap-[6px] px-[24px]">
              <CaretCircleLeftIcon width={24} height={24} />
              <Text className="font-inter-semibold text-[16px] text-black">{t('Pilih bank')}</Text>
            </Pressable>
            <View className="mx-[24px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder={t('Cari bank')}
                placeholderTextColor="#9ca3af"
                autoCorrect={false}
                className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
            <ScrollView contentContainerClassName="px-[24px]" keyboardShouldPersistTaps="handled">
              {banks.length > 0 ? (
                <Text className="pt-[4px] font-inter-bold text-[10px] uppercase text-neutral-500">
                  {t('Bank')}
                </Text>
              ) : null}
              {banks.map((name) => (
                <Option key={name} name={name} />
              ))}
              {wallets.length > 0 ? (
                <Text className="pt-[16px] font-inter-bold text-[10px] uppercase text-neutral-500">
                  {t('E-wallet')}
                </Text>
              ) : null}
              {wallets.map((name) => (
                <Option key={name} name={name} />
              ))}
              <Pressable
                onPress={() => pick(null)}
                accessibilityRole="radio"
                accessibilityState={{ checked: current === null }}
                className="flex-row items-center justify-between py-[12px]">
                <Text
                  className={cn(
                    'font-inter text-[14px]',
                    current === null ? 'font-inter-semibold text-orange-500' : 'text-neutral-800'
                  )}>
                  {t('Lainnya (tulis sendiri)')}
                </Text>
                {current === null ? (
                  <Text className="font-inter-bold text-[14px] text-orange-500">✓</Text>
                ) : null}
              </Pressable>
            </ScrollView>
          </View>
        );
      }}
    </BottomSheet>
  );
}

export { BankAccountsSheet, BankPickerSheet, BankPrivacySheet, ConfirmPasswordSheet };
