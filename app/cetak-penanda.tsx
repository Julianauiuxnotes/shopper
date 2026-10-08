import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import CheckSquareIcon from '@/assets/images/figma/icon-check-square.svg';
import ShopperLogo from '@/assets/images/figma/shopper-logo.svg';
import { JastiperLogo } from '@/components/jastiper-logo';
import { Text } from '@/components/ui/text';
import { computeItemTotals, useEvents } from '@/lib/events-store';
import { formatDateRange, formatIDR, formatPrintTimestamp } from '@/lib/format';
import { useSettings } from '@/lib/settings-store';
import { cn } from '@/lib/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';

// Figma section "Cetak penanda" (node 176:726, 3 sample frames "1/3",
// "2/3", "3/3") — reached by tapping an already-bought item's "Cetak
// penanda" button on Order Detail. Each Figma frame is really the SAME
// screen rendered at a different point in a shopping trip: "Cetak
// pesanan ke: N/total" and the item list's checkmarks are cumulative —
// frame 1 checks only the 1st item, frame 2 checks the 1st AND 2nd, etc.
// So rather than hardcoding 3 variants, this one screen computes N from
// which item's own "Cetak penanda" button was tapped (`itemId` param,
// via its index in `order.items`) and checks every item up to and
// including that index — exactly reproducing what the 3 Figma frames
// show as a progression, for any order size.
//
// Styled as a literal receipt (dashed `border-dashed` separators,
// centered content, "Powered by" wordmark footer) since that's what
// this screen literally is — a print preview for a physical marker/tag
// the jastiper attaches to the purchased item. "Logo Jastiper" shows the
// logo uploaded in Pengaturan, or Figma's own placeholder box when none
// is set (components/jastiper-logo.tsx). "[Nama Jastiper]" is Figma's placeholder-token notation
// for "insert the real name here", not literal text — resolved to the
// signed-up business name via the same `userProfile.namaJastip`
// fallback pattern used for the WhatsApp messages elsewhere in the app.
//
// Figma's own frames don't show a print-trigger button (the page IS the
// printable content, same as a browser print preview) — but every other
// single-purpose screen in this app gets a matching action button, so a
// "Cetak" button was added at the bottom: `window.print()` on web is a
// real, fully working browser feature (not a stub); native printing
// would need `expo-print` plus real printer pairing, well beyond this
// screen's own scope, so it's a TODO stub there for now, same precedent
// as "Cetak penanda" itself was before this screen existed.
export default function CetakPenandaScreen() {
  const router = useRouter();
  const { getEvent, getOrder } = useEvents();
  const { userProfile } = useSettings();
  const { eventId, orderId, itemId } = useLocalSearchParams<{
    eventId?: string;
    orderId?: string;
    itemId?: string;
  }>();
  const event = eventId ? getEvent(eventId) : undefined;
  const order = eventId && orderId ? getOrder(eventId, orderId) : undefined;

  // Captured once per visit, not live-ticking — this is a print
  // timestamp ("when was this printed"), not a clock.
  const printedAt = React.useMemo(() => new Date(), []);

  if (!event || !order) {
    return (
      <View className="flex-1 items-center justify-center gap-[8px] bg-white px-[20px]">
        <Text className="font-inter-bold text-[16px] text-neutral-900">
          Pesanan tidak ditemukan
        </Text>
        <Pressable onPress={() => router.replace('/dashboard')}>
          <Text className="font-inter-semibold text-[14px] text-orange-500">
            Kembali ke Dashboard
          </Text>
        </Pressable>
      </View>
    );
  }

  const currentIndex = order.items.findIndex((it) => it.id === itemId);
  const totalItems = order.items.length;

  function handleCetak() {
    if (Platform.OS === 'web') {
      window.print();
      return;
    }
    Alert.alert('Segera hadir', 'Fitur cetak penanda belum tersedia di perangkat ini.');
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerClassName="items-center gap-[24px] px-[16px] py-[24px]">
        <Pressable onPress={() => router.back()} hitSlop={8} className="w-full">
          <CaretCircleLeftIcon width={24} height={24} />
        </Pressable>

        <View className="items-center gap-[16px]">
          <View className="items-center gap-[11px]">
            <JastiperLogo />
            <Text className="font-inter text-[14px] text-neutral-800">
              {userProfile.namaJastip || 'Jastip by Juli'}
            </Text>
            <Text className="font-inter text-[12px] text-neutral-800">
              Waktu cetak : {formatPrintTimestamp(printedAt)}
            </Text>
          </View>
          <View className="items-center gap-[3px]">
            <Text className="font-inter text-[14px] text-neutral-800">Cetak pesanan ke:</Text>
            <Text className="font-inter-semibold text-[14px] text-neutral-800">
              {currentIndex + 1}/{totalItems}
            </Text>
          </View>
        </View>

        <View className="w-full border-t border-dashed border-neutral-400" />

        <View className="w-full gap-[10px]">
          <View className="flex-row gap-[3px]">
            <Text className="w-[131px] font-inter text-[12px] text-neutral-800">Nama acara</Text>
            <Text className="font-inter text-[12px] text-neutral-800">: {event.namaAcara}</Text>
          </View>
          <View className="flex-row gap-[3px]">
            <Text className="w-[131px] font-inter text-[12px] text-neutral-800">Tanggal acara</Text>
            <Text className="font-inter text-[12px] text-neutral-800">
              : {formatDateRange(event.tanggalDari, event.tanggalSampai)}
            </Text>
          </View>
          <View className="flex-row gap-[3px]">
            <Text className="w-[131px] font-inter text-[12px] text-neutral-800">Nomor order</Text>
            <Text className="font-inter text-[12px] text-neutral-800">
              :{' '}
              <Text className="font-inter-bold text-[12px] text-neutral-800">
                {order.orderNumber}
              </Text>
            </Text>
          </View>
          <View className="flex-row gap-[3px]">
            <Text className="w-[131px] font-inter text-[12px] text-neutral-800">Nama customer</Text>
            <Text className="font-inter text-[12px] text-neutral-800">: {order.nama}</Text>
          </View>
          <View className="flex-row items-start gap-[3px]">
            <Text className="w-[131px] font-inter text-[12px] text-neutral-800">Alamat</Text>
            <Text className="flex-1 font-inter text-[12px] text-neutral-800">: {order.alamat}</Text>
          </View>
          <View className="flex-row gap-[3px]">
            <Text className="w-[131px] font-inter text-[12px] text-neutral-800">Total pesanan</Text>
            <Text className="font-inter text-[12px] text-neutral-800">: {totalItems} items</Text>
          </View>
          <View className="flex-row gap-[3px]">
            <Text className="w-[131px] font-inter text-[12px] text-neutral-800">
              Status pembayaran
            </Text>
            <Text className="font-inter text-[12px] text-neutral-800">
              :{' '}
              <Text className="font-inter-bold text-[12px] text-neutral-800">
                {order.statusPembayaran === 'lunas'
                  ? 'Lunas'
                  : order.statusPembayaran === 'belumLunas'
                    ? 'Belum lunas'
                    : 'Belum bayar'}
              </Text>
            </Text>
          </View>
        </View>

        <View className="w-full border-t border-dashed border-neutral-400" />

        <View className="w-full gap-[11px]">
          <Text className="font-inter-bold text-[10px] text-[#1e1e1e]">List pesanan</Text>
          {order.items.map((item, index) => {
            const { fee } = computeItemTotals(item);
            const perUnitInclFee = item.harga + fee / item.jumlah;
            const checked = index <= currentIndex;
            return (
              <View
                key={item.id}
                className={cn(
                  'gap-[8px]',
                  index > 0 && 'border-t border-dashed border-neutral-300 pt-[11px]'
                )}>
                <View className="flex-row items-center gap-[5px]">
                  {checked ? (
                    <CheckSquareIcon width={12} height={12} />
                  ) : (
                    <View className="size-[10px] rounded-[2px] border border-neutral-400" />
                  )}
                  <Text
                    className={cn(
                      'font-inter text-[10px]',
                      checked ? 'text-[#1e1e1e]' : 'text-neutral-400'
                    )}>
                    {item.namaProduk}
                  </Text>
                </View>
                <Text
                  className={cn(
                    'font-inter text-[10px]',
                    checked ? 'text-[#1e1e1e]' : 'text-neutral-400'
                  )}>
                  {item.jumlah}x {formatIDR(perUnitInclFee)}*
                </Text>
              </View>
            );
          })}
          <Text className="font-inter text-[10px] text-[#1e1e1e]">
            *Harga sudah termasuk jastip fee
          </Text>
        </View>

        <View className="w-full border-t border-dashed border-neutral-400" />

        <View className="items-center gap-[2px]">
          <Text className="font-poppins text-[12px] text-neutral-400">Powered by:</Text>
          <ShopperLogo width={110} height={18} />
        </View>

        <Pressable
          onPress={handleCetak}
          className="w-full items-center justify-center rounded-[12px] bg-orange-500 px-[10px] py-[16px]">
          <Text className="font-inter-semibold text-[14px] text-white">Cetak</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
