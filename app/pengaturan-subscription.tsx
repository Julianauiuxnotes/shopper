import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { AddMemberSheet, TeamSection } from '@/components/team-section';
import { BuyTokenSheet, TokenSection } from '@/components/token-section';
import { Text } from '@/components/ui/text';
import { type TokenPaymentStatus, useAuth } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

// Tokens and shop members, reached from Dashboard's hamburger menu. No
// Figma design exists for this; the header follows Pengaturan Publikasi.
// The sheets are rendered here, outside the ScrollView, so they cover the
// whole screen on phones too.
export default function PengaturanSubscriptionScreen() {
  const router = useRouter();
  const t = useT();
  const [sheet, setSheet] = React.useState<'tokens' | 'member' | null>(null);
  // Set by Midtrans when it sends the user back after "Beli token".
  const { order_id: orderId } = useLocalSearchParams<{ order_id?: string }>();

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
              {t('Pengaturan Subscription')}
            </Text>
          </Pressable>

          {orderId ? (
            <PaymentNotice orderId={orderId} onClose={() => router.setParams({ order_id: '' })} />
          ) : null}
          <TokenSection onBuyTokens={() => setSheet('tokens')} />
          <View className="h-px w-full bg-neutral-300" />
          <TeamSection onAddMember={() => setSheet('member')} />
        </ScrollView>
      </KeyboardAvoidingView>

      {sheet === 'tokens' ? <BuyTokenSheet onClose={() => setSheet(null)} /> : null}
      {sheet === 'member' ? <AddMemberSheet onClose={() => setSheet(null)} /> : null}
    </>
  );
}

// How long to keep checking for Midtrans's confirmation after returning.
const POLL_MS = 3000;
const POLL_TIMES = 20;

// Back from Midtrans's checkout: the tokens arrive when Midtrans tells
// the server (supabase/functions/midtrans-notify), usually a few seconds
// after paying, so this checks the payment until it's settled.
function PaymentNotice({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const t = useT();
  const { tokenPaymentStatus, refreshShop } = useAuth();
  const [status, setStatus] = React.useState<TokenPaymentStatus | null>('pending');

  React.useEffect(() => {
    let stopped = false;
    let tries = 0;
    async function check() {
      const next = await tokenPaymentStatus(orderId).catch(() => 'pending' as const);
      if (stopped) return;
      setStatus(next);
      if (next === 'paid') await refreshShop().catch(() => {});
      else if (next === 'pending' && ++tries < POLL_TIMES) timer = setTimeout(check, POLL_MS);
    }
    let timer = setTimeout(check, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [orderId, tokenPaymentStatus, refreshShop]);

  const message =
    status === 'paid'
      ? t('Pembayaran berhasil. Token sudah masuk ke saldo toko.')
      : status === 'expired' || status === 'failed'
        ? t('Pembayaran tidak selesai. Token tidak ditambahkan.')
        : status === null
          ? t('Pembayaran tidak ditemukan.')
          : t('Menunggu konfirmasi pembayaran... Token masuk otomatis setelah pembayaran diterima.');

  return (
    <View
      className={cn(
        'flex-row items-start gap-[10px] rounded-[8px] p-[12px]',
        status === 'paid' ? 'bg-green-100' : status === 'pending' ? 'bg-orange-100' : 'bg-red-100'
      )}>
      <Text
        className={cn(
          'flex-1 font-inter text-[12px]',
          status === 'paid'
            ? 'text-green-700'
            : status === 'pending'
              ? 'text-neutral-800'
              : 'text-red-600'
        )}>
        {message}
      </Text>
      <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
        <Text className="font-inter-semibold text-[12px] text-neutral-600">{t('Tutup')}</Text>
      </Pressable>
    </View>
  );
}
