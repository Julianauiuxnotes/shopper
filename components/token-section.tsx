import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Text } from '@/components/ui/text';
import { costLabel, type TokenEntry, useAuth } from '@/lib/auth-store';
import { useEvents } from '@/lib/events-store';
import { formatDate, formatIDR } from '@/lib/format';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, View } from 'react-native';

// Bundles of Justipers tokens. 1 token is IDR 4,000; bigger bundles cost
// less per token. Only bundles are sold: a single 4,000 payment would
// lose too much to payment fees.
const TOKEN_BUNDLES = [
  { tokens: 5, price: 20_000 },
  { tokens: 10, price: 37_500 },
  { tokens: 25, price: 87_500 },
  { tokens: 50, price: 160_000 },
];

const KIND_LABELS: Record<string, string> = {
  bonus: 'Token gratis',
  purchase: 'Beli token',
  open_event: 'Buka event',
  publish_event: 'Publikasi form order',
  member_slot: 'Slot anggota',
  refund_event: 'Refund buka event',
  adjustment: 'Penyesuaian',
};

const HISTORY_SHOWN = 10;

// Top of Pengaturan Subscription (app/pengaturan-subscription.tsx): the
// shop's token balance, what things cost, and its token history. Rules
// and prices live on the server (supabase/migrations/0007_shopper_tokens.sql).
function TokenSection({ onBuyTokens }: { onBuyTokens: () => void }) {
  const { shop, isAdmin, prices, beta, loadTokenHistory } = useAuth();
  const { getEvent } = useEvents();
  const [history, setHistory] = React.useState<TokenEntry[] | null>(null);
  const [historyError, setHistoryError] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const balance = shop?.tokenBalance ?? 0;

  // Reloaded whenever the balance moves, so a spend shows up at once.
  React.useEffect(() => {
    let cancelled = false;
    loadTokenHistory()
      .then((entries) => {
        if (cancelled) return;
        setHistory(entries);
        setHistoryError(false);
      })
      .catch(() => {
        if (!cancelled) setHistoryError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [balance, loadTokenHistory]);

  function describe(entry: TokenEntry) {
    if (entry.kind === 'member_slot' && entry.email) return entry.email;
    if (entry.eventId) return getEvent(entry.eventId)?.namaAcara ?? 'Event yang sudah dihapus';
    return entry.note;
  }

  const shown = showAll ? (history ?? []) : (history ?? []).slice(0, HISTORY_SHOWN);

  return (
    <View className="gap-[12px]">
      <View className="gap-[10px] rounded-[12px] bg-orange-500 p-[16px]">
        <Text className="font-inter text-[12px] text-orange-50">Saldo token toko</Text>
        <View className="flex-row items-end justify-between gap-[10px]">
          {beta ? (
            <Text className="font-inter-bold text-[28px] text-white">
              ∞{' '}
              <Text className="font-inter-semibold text-[14px] text-white">tidak terbatas</Text>
            </Text>
          ) : (
            <Text className="font-inter-bold text-[28px] text-white">
              {balance} <Text className="font-inter-semibold text-[14px] text-white">token</Text>
            </Text>
          )}
          {isAdmin ? (
            // Nothing to buy during the beta: shown, but disabled.
            <Pressable
              onPress={onBuyTokens}
              disabled={beta}
              accessibilityRole="button"
              accessibilityState={{ disabled: beta }}
              className={cn(
                'h-[38px] justify-center rounded-[8px] px-[12px]',
                beta ? 'bg-white/40' : 'bg-white'
              )}>
              <Text
                className={cn(
                  'font-inter-semibold text-[12px]',
                  beta ? 'text-orange-100' : 'text-orange-500'
                )}>
                Beli token
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text className="font-inter text-[10px] text-orange-50">
          Buka event {costLabel(prices.openEvent)} · Publikasi form order{' '}
          {costLabel(prices.publishEvent)} · Slot anggota {costLabel(prices.memberSlot)}
        </Text>
      </View>
      {beta ? (
        <Text className="font-inter text-[10px] text-neutral-500">
          Justipers sedang dalam masa beta: token tidak terbatas dan semua fitur gratis. Saldo
          tokenmu ({balance} token) tetap tersimpan untuk dipakai setelah beta berakhir.
        </Text>
      ) : null}
      {!isAdmin ? (
        <Text className="font-inter text-[10px] text-neutral-500">
          Hanya admin yang bisa memakai dan membeli token toko.
        </Text>
      ) : null}

      <View className="gap-[6px]">
        <Text className="font-inter-bold text-[12px] text-neutral-800">Riwayat token</Text>
        {historyError && history === null ? (
          <Text className="font-inter text-[12px] text-neutral-500">
            Riwayat tidak bisa dimuat. Cek koneksi internet.
          </Text>
        ) : history === null ? (
          <Text className="font-inter text-[12px] text-neutral-500">Memuat...</Text>
        ) : history.length === 0 ? (
          <Text className="font-inter text-[12px] text-neutral-500">Belum ada riwayat.</Text>
        ) : (
          <View className="rounded-[8px] border border-neutral-300 bg-white">
            {shown.map((entry, index) => (
              <View
                key={entry.id}
                className={cn(
                  'flex-row items-center gap-[8px] p-[10px]',
                  index > 0 && 'border-t border-neutral-200'
                )}>
                <View className="flex-1 gap-[2px]">
                  <Text className="font-inter-semibold text-[12px] text-neutral-800">
                    {KIND_LABELS[entry.kind] ?? entry.kind}
                  </Text>
                  <Text numberOfLines={1} className="font-inter text-[10px] text-neutral-600">
                    {[formatDate(new Date(entry.createdAt)), describe(entry)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Text
                  className={cn(
                    'font-inter-bold text-[12px]',
                    entry.delta > 0 ? 'text-green-600' : 'text-neutral-800'
                  )}>
                  {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                </Text>
              </View>
            ))}
          </View>
        )}
        {history && history.length > HISTORY_SHOWN ? (
          <Pressable onPress={() => setShowAll((s) => !s)} hitSlop={8}>
            <Text className="font-inter-semibold text-[12px] text-orange-500">
              {showAll ? 'Tampilkan lebih sedikit' : 'Lihat semua riwayat'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// "Beli token": the bundles. Online payment isn't connected yet, so the
// sheet shows the prices and says so; tokens are added by hand meanwhile.
function BuyTokenSheet({ onClose }: { onClose: () => void }) {
  const [choice, setChoice] = React.useState(TOKEN_BUNDLES[1].tokens);

  return (
    <BottomSheet onClose={onClose} sheetClassName="bg-orange-100">
      {(close) => (
        <View className="gap-[20px] px-[31px] pb-[32px] pt-[24.5px]">
          <Pressable onPress={close} hitSlop={8} className="flex-row items-center gap-[6px]">
            <CaretCircleLeftIcon width={24} height={24} />
            <Text className="font-inter-semibold text-[16px] text-black">Beli token</Text>
          </Pressable>

          <View accessibilityRole="radiogroup" className="gap-[10px]">
            {TOKEN_BUNDLES.map((bundle) => {
              const selected = choice === bundle.tokens;
              const perToken = bundle.price / bundle.tokens;
              return (
                <Pressable
                  key={bundle.tokens}
                  onPress={() => setChoice(bundle.tokens)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  aria-checked={selected}
                  className={cn(
                    'flex-row items-center gap-[10px] rounded-[8px] border bg-white p-[12px]',
                    selected ? 'border-orange-500' : 'border-neutral-400'
                  )}>
                  <View
                    className={cn(
                      'h-[16px] w-[16px] items-center justify-center rounded-full border',
                      selected ? 'border-orange-500' : 'border-neutral-400'
                    )}>
                    {selected ? (
                      <View className="h-[8px] w-[8px] rounded-full bg-orange-500" />
                    ) : null}
                  </View>
                  <View className="flex-1 gap-[2px]">
                    <Text className="font-inter-semibold text-[14px] text-neutral-800">
                      {bundle.tokens} token
                    </Text>
                    <Text className="font-inter text-[12px] text-neutral-700">
                      {formatIDR(perToken)} per token
                    </Text>
                  </View>
                  <Text className="font-inter-bold text-[14px] text-neutral-800">
                    {formatIDR(bundle.price)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-center font-inter text-[12px] text-neutral-700">
            Pembayaran online segera hadir. Untuk sementara, hubungi tim Justipers untuk menambah
            token.
          </Text>

          <Pressable
            disabled
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            className="w-full items-center justify-center rounded-[12px] bg-orange-200 px-[10px] py-[16px]">
            <Text className="font-inter-semibold text-[14px] text-orange-300">
              Bayar (segera hadir)
            </Text>
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}

export { BuyTokenSheet, TokenSection };
