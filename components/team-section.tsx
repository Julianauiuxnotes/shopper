import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  AuthError,
  MEMBER_LIMIT,
  type ShopInvite,
  type ShopMember,
  costLabel,
  useAuth,
} from '@/lib/auth-store';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, View } from 'react-native';

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Anggota' } as const;

type PendingAction =
  | { kind: 'remove'; member: ShopMember }
  | { kind: 'cancel'; invite: ShopInvite }
  | { kind: 'admin'; member: ShopMember; admin: boolean };

// The members part of Pengaturan Subscription (app/pengaturan-subscription.tsx):
// who is in the shop, invites still waiting, and adding a member. No Figma
// design exists for this; it follows the settings screens.
//
// Who may do what, enforced again on the server
// (supabase/migrations/0007_shopper_tokens.sql):
//   - Admins (the owner is one) add members, by buying a 5-token slot for
//     one email, and remove members or cancel invites.
//   - Only the owner makes someone an admin or takes it away. An admin
//     can't be removed until that's done, and the owner never can be.
//
// Prototype: there is no invitation email. The invited person signs up in
// Justipers with the invited address and lands in this shop.
function TeamSection({ onAddMember }: { onAddMember: () => void }) {
  const {
    shop,
    role,
    isAdmin,
    members,
    invites,
    userId,
    prices,
    beta,
    cancelInvite,
    removeMember,
    setAdmin,
  } = useAuth();
  const t = useT();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<PendingAction | null>(null);

  if (!shop) return null;
  const isOwner = role === 'owner';
  const used = members.filter((m) => m.role !== 'owner').length + invites.length;

  async function confirmPending() {
    const action = pending;
    setPending(null);
    if (!action || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (action.kind === 'remove') await removeMember(action.member.userId);
      if (action.kind === 'cancel') await cancelInvite(action.invite.id);
      if (action.kind === 'admin') await setAdmin(action.member.userId, action.admin);
    } catch (e) {
      setError(
        e instanceof AuthError ? e.message : t('Terjadi kesalahan. Coba lagi sebentar lagi.')
      );
    } finally {
      setBusy(false);
    }
  }

  const name = (member: ShopMember) => member.nama || member.email;
  const dialog =
    pending?.kind === 'remove'
      ? {
          title: t('Hapus anggota?'),
          message: t(
            '{name} tidak bisa lagi membuka toko ini. Slot anggotanya ikut hilang dan token tidak dikembalikan.',
            { name: name(pending.member) }
          ),
          confirmLabel: t('Hapus'),
          tone: 'danger' as const,
        }
      : pending?.kind === 'cancel'
        ? {
            title: t('Batalkan undangan?'),
            message: t(
              'Undangan untuk {email} dibatalkan. Slot anggotanya ikut hilang dan token tidak dikembalikan.',
              { email: pending.invite.email }
            ),
            confirmLabel: t('Batalkan undangan'),
            tone: 'danger' as const,
          }
        : pending?.kind === 'admin' && pending.admin
          ? {
              title: t('Jadikan admin?'),
              message: t(
                '{name} akan bisa memakai token toko: membuka event, mempublikasikan form order, dan membeli slot anggota.',
                { name: name(pending.member) }
              ),
              confirmLabel: t('Jadikan admin'),
              tone: 'primary' as const,
            }
          : pending?.kind === 'admin'
            ? {
                title: t('Cabut status admin?'),
                message: t('{name} tidak bisa lagi memakai token toko.', {
                  name: name(pending.member),
                }),
                confirmLabel: t('Cabut admin'),
                tone: 'danger' as const,
              }
            : null;

  return (
    <View className="gap-[12px]">
      <View className="gap-[6px]">
        <View className="flex-row items-center justify-between">
          <Text className="font-inter-bold text-[12px] text-neutral-800">{t('Anggota toko')}</Text>
          <Text className="font-inter text-[10px] text-neutral-600">
            {t('{used}/{limit} slot terpakai', { used, limit: MEMBER_LIMIT })}
          </Text>
        </View>
        {members.map((member) => (
          <View
            key={member.userId}
            className="flex-row items-center justify-between gap-[8px] rounded-[8px] border border-neutral-300 bg-white p-[10px]">
            <View className="flex-1 gap-[2px]">
              <View className="flex-row flex-wrap items-center gap-[6px]">
                <Text className="font-inter-semibold text-[12px] text-neutral-800">
                  {name(member)}
                  {member.userId === userId ? t(' (kamu)') : ''}
                </Text>
                {member.role !== 'member' ? (
                  <View
                    className={cn(
                      'rounded-full px-[6px] py-[1px]',
                      member.role === 'owner' ? 'bg-orange-500' : 'bg-orange-100'
                    )}>
                    <Text
                      className={cn(
                        'font-inter-semibold text-[10px]',
                        member.role === 'owner' ? 'text-white' : 'text-orange-600'
                      )}>
                      {t(ROLE_LABELS[member.role])}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="font-inter text-[10px] text-neutral-600">{member.email}</Text>
            </View>
            <View className="items-end gap-[6px]">
              {isOwner && member.role !== 'owner' ? (
                <Pressable
                  onPress={() =>
                    setPending({ kind: 'admin', member, admin: member.role === 'member' })
                  }
                  disabled={busy}
                  accessibilityRole="button"
                  hitSlop={8}>
                  <Text className="font-inter-semibold text-[12px] text-orange-500 underline">
                    {member.role === 'admin' ? t('Cabut admin') : t('Jadikan admin')}
                  </Text>
                </Pressable>
              ) : null}
              {isAdmin && member.role === 'member' ? (
                <Pressable
                  onPress={() => setPending({ kind: 'remove', member })}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t('Hapus anggota {email}', { email: member.email })}
                  hitSlop={8}>
                  <Text className="font-inter-semibold text-[12px] text-red-500 underline">
                    {t('Hapus')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
        {invites.map((invite) => (
          <View
            key={invite.id}
            className="flex-row items-center justify-between gap-[8px] rounded-[8px] border border-dashed border-neutral-400 bg-neutral-50 p-[10px]">
            <View className="flex-1 gap-[2px]">
              <Text className="font-inter-semibold text-[12px] text-neutral-800">
                {invite.email}
              </Text>
              <Text className="font-inter text-[10px] text-neutral-600">
                {t('Diundang, belum mendaftar')}
              </Text>
            </View>
            {isAdmin ? (
              <Pressable
                onPress={() => setPending({ kind: 'cancel', invite })}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('Batalkan undangan {email}', { email: invite.email })}
                hitSlop={8}>
                <Text className="font-inter-semibold text-[12px] text-red-500 underline">
                  {t('Batalkan')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {isAdmin && !isOwner && members.some((m) => m.role === 'admin') ? (
          <Text className="font-inter text-[10px] text-neutral-500">
            {t('Admin hanya bisa dihapus setelah pemilik toko mencabut status adminnya.')}
          </Text>
        ) : null}
      </View>

      {!isAdmin ? (
        <Text className="font-inter text-[10px] text-neutral-500">
          {t('Hanya admin yang bisa menambah atau menghapus anggota.')}
        </Text>
      ) : used < MEMBER_LIMIT ? (
        <View className="gap-[6px]">
          <View className="mb-[4px] gap-[2px]">
            <Text className="font-inter-bold text-[12px] text-neutral-800">
              {t('Undang anggota')}
            </Text>
            <Text className="font-inter text-[12px] text-neutral-600">
              {t('Kamu bisa undang orang untuk memiliki akses yang sama di Justipers app.')}{' '}
              {beta
                ? t('Fitur ini akan tersedia saat Justipers versi lengkap dirilis.')
                : t('Satu slot anggota {cost}, sekali bayar.', {
                    cost: costLabel(prices.memberSlot),
                  })}
            </Text>
          </View>
          {/* Inviting members is held back until the full release. */}
          <Pressable
            onPress={onAddMember}
            disabled={beta}
            accessibilityRole="button"
            accessibilityState={{ disabled: beta }}
            className={cn(
              'h-[38px] items-center justify-center rounded-[8px] border px-[10px]',
              beta ? 'border-neutral-300 bg-neutral-100' : 'border-orange-400 bg-orange-50'
            )}>
            <Text
              className={cn(
                'font-inter-semibold text-[12px]',
                beta ? 'text-neutral-500' : 'text-orange-500'
              )}>
              {beta
                ? t('Tambah anggota · Segera hadir')
                : t('Tambah anggota · {cost}', { cost: costLabel(prices.memberSlot) })}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text className="font-inter text-[10px] text-neutral-500">
          {t('Toko ini sudah mencapai batas {n} anggota.', { n: MEMBER_LIMIT })}
        </Text>
      )}

      {error ? <Text className="font-inter text-[12px] text-red-500">{error}</Text> : null}

      <ConfirmDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel ?? ''}
        tone={dialog?.tone}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}

// "Tambah anggota": buys a member slot for one email. The slot can never
// be moved to another email, so the email is typed twice and the sheet
// says plainly what happens if it's wrong. Rendered by the page itself,
// outside its ScrollView, so it covers the whole screen on phones too.
function AddMemberSheet({ onClose }: { onClose: () => void }) {
  const { shop, prices, buyMemberSlot } = useAuth();
  const t = useT();
  const [email, setEmail] = React.useState('');
  const [confirmEmail, setConfirmEmail] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const balance = shop?.tokenBalance ?? 0;

  const normalized = email.trim().toLowerCase();
  const mismatch = confirmEmail.length > 0 && normalized !== confirmEmail.trim().toLowerCase();
  const looksLikeEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized);
  const free = prices.memberSlot === 0;
  const enoughTokens = balance >= prices.memberSlot;
  const canBuy = looksLikeEmail && confirmEmail.length > 0 && !mismatch && enoughTokens && !saving;

  async function handleBuy(close: () => void) {
    if (!canBuy) return;
    setSaving(true);
    setError(null);
    try {
      await buyMemberSlot(normalized);
      close();
    } catch (e) {
      setError(
        e instanceof AuthError ? e.message : t('Terjadi kesalahan. Coba lagi sebentar lagi.')
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet onClose={onClose} sheetClassName="bg-orange-100">
      {(close) => (
        <View className="gap-[16px] px-[31px] pb-[32px] pt-[24.5px]">
          <Pressable onPress={close} hitSlop={8} className="flex-row items-center gap-[6px]">
            <CaretCircleLeftIcon width={24} height={24} />
            <Text className="font-inter-semibold text-[16px] text-black">
              {t('Tambah anggota')}
            </Text>
          </Pressable>

          <View className="gap-[10px]">
            <View className="gap-[4px]">
              <Text className="font-inter text-[12px] text-neutral-800">{t('Email anggota')}</Text>
              <Input
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError(null);
                }}
                placeholder="nama@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="h-[38px] rounded-[8px] border-neutral-400 bg-white px-[10px] py-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
            <View className="gap-[4px]">
              <Text className="font-inter text-[12px] text-neutral-800">
                {t('Ketik ulang email')}
              </Text>
              <Input
                value={confirmEmail}
                onChangeText={(value) => {
                  setConfirmEmail(value);
                  setError(null);
                }}
                placeholder="nama@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className={cn(
                  'h-[38px] rounded-[8px] bg-white px-[10px] py-0 text-[12px] text-neutral-800 shadow-none',
                  mismatch ? 'border-red-500' : 'border-neutral-400'
                )}
              />
              {mismatch ? (
                <Text className="font-inter text-[10px] text-red-500">
                  {t('Email tidak sama.')}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="gap-[6px] rounded-[8px] border border-orange-300 bg-white p-[10px]">
            <Text className="font-inter-semibold text-[12px] text-neutral-800">
              {free
                ? t('Periksa email ini sebelum mengundang')
                : t('Periksa email ini sebelum membeli')}
            </Text>
            <Text className="font-inter text-[12px] leading-[17px] text-neutral-700">
              {[
                t(
                  'Slot anggota terikat ke email ini dan tidak bisa diganti atau dipindahkan ke orang lain.'
                ),
                t('Kalau emailnya salah, kamu perlu membeli slot baru untuk email yang benar.'),
                t('Menghapus anggota atau membatalkan undangan tidak mengembalikan token.'),
                t('Anggota bergabung dengan mendaftar di Justipers memakai email ini persis.'),
              ]
                .map((line) => `• ${line}`)
                .join('\n')}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="font-inter text-[12px] text-neutral-800">
              {t('Biaya:')}{' '}
              <Text className="font-inter-semibold text-[12px] text-neutral-800">
                {costLabel(prices.memberSlot)}
              </Text>
            </Text>
            <Text className="font-inter text-[12px] text-neutral-700">
              {t('Saldo:')} {free ? t('tidak terbatas') : t('{n} token', { n: balance })}
            </Text>
          </View>
          {!enoughTokens ? (
            <Text className="font-inter text-[10px] text-red-500">
              {t('Token tidak cukup. Beli token dulu.')}
            </Text>
          ) : null}
          {error ? (
            <Text className="text-center font-inter text-[12px] text-red-500">{error}</Text>
          ) : null}

          <Pressable
            onPress={() => handleBuy(close)}
            disabled={!canBuy}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canBuy, busy: saving }}
            className={cn(
              'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
              canBuy ? 'bg-orange-500' : 'bg-orange-200'
            )}>
            <Text
              className={cn(
                'font-inter-semibold text-[14px]',
                canBuy ? 'text-white' : 'text-orange-300'
              )}>
              {saving
                ? t('Memproses...')
                : free
                  ? t('Undang · Gratis')
                  : t('Beli slot & undang · {n} token', { n: prices.memberSlot })}
            </Text>
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}

export { AddMemberSheet, TeamSection };
