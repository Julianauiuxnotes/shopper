import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { JastiperLogo } from '@/components/jastiper-logo';
import { TagihanReceipt } from '@/components/tagihan-receipt';
import { Text } from '@/components/ui/text';
import { useEvents } from '@/lib/events-store';
import { formatIDR } from '@/lib/format';
import { buildReceiptLink, buildReceiptSnapshot } from '@/lib/receipt-link';
import { useSettings } from '@/lib/settings-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, View } from 'react-native';

// Preview of the customer's bill (Figma node 181:175), opened in place
// by Order Detail's "Cetak tagihan customer" button. Replaces the earlier
// "save the receipt as an image" behaviour, which didn't work in mobile
// browsers.
export default function TagihanScreen() {
  const router = useRouter();
  const { getEvent, getOrder } = useEvents();
  const { userProfile } = useSettings();
  const { eventId, orderId } = useLocalSearchParams<{ eventId?: string; orderId?: string }>();
  const event = eventId ? getEvent(eventId) : undefined;
  const order = eventId && orderId ? getOrder(eventId, orderId) : undefined;
  const printedAt = React.useMemo(() => new Date(), []);
  const [linkCopied, setLinkCopied] = React.useState(false);

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

  // Opened directly (reload, shared link) there's no history to go back
  // to, so fall back to the order.
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace({
      pathname: '/order-detail',
      params: { eventId: event!.id, orderId: order!.id },
    });
  }

  const snapshot = buildReceiptSnapshot(
    event,
    order,
    {
      namaJastip: userProfile.namaJastip || 'Jastip by Juli',
      telepon: userProfile.telepon ?? '',
    },
    printedAt
  );

  // The customer opens this link to see the same receipt on a public page
  // (app/r.tsx) — no Shopper account needed, see lib/receipt-link.ts.
  function buildShareMessage() {
    return (
      `Hi ${order!.nama}! Ini tagihan pesananmu dari ${snapshot.nj} ` +
      `(${snapshot.on}), total ${formatIDR(snapshot.tt)}. ` +
      `Lihat rinciannya di sini:\n${buildReceiptLink(snapshot)}`
    );
  }

  // Straight into the customer's own WhatsApp chat with the message
  // ready — the jastiper still taps send. Same wa.me pattern as Tambah
  // Pesanan's "Konfirmasi dan kirim total pembayaran".
  async function handleKirimWhatsapp() {
    const phoneDigits = order!.whatsapp.replace(/\D/g, '');
    const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(buildShareMessage())}`;
    try {
      await Linking.openURL(waUrl);
    } catch {
      // no WhatsApp / can't open the link — nothing else to do here.
    }
  }

  // The device's own share sheet (any app, any contact). Desktop browsers
  // mostly don't have one, so there the link is copied instead.
  async function handleBagikanLink() {
    try {
      await Share.share({ message: buildShareMessage() });
      return;
    } catch {
      // share sheet unavailable or dismissed — fall through to copying on web
    }
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(buildReceiptLink(snapshot));
        setLinkCopied(true);
      } catch {
        // clipboard blocked — nothing else to do here.
      }
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerClassName="items-center pb-[24px]">
        <Pressable onPress={handleBack} hitSlop={8} className="w-full px-[16px] pt-[20px]">
          <CaretCircleLeftIcon width={24} height={24} />
        </Pressable>
        <TagihanReceipt snapshot={snapshot} logo={<JastiperLogo />} />

        <View className="w-full max-w-[390px] gap-[10px] px-[16px] pt-[8px]">
          <Pressable
            onPress={handleKirimWhatsapp}
            accessibilityRole="button"
            className="w-full items-center justify-center rounded-[12px] bg-orange-500 px-[10px] py-[16px]">
            <Text className="font-inter-semibold text-[14px] text-orange-50">
              Kirim ke WhatsApp customer
            </Text>
          </Pressable>
          <Pressable
            onPress={handleBagikanLink}
            accessibilityRole="button"
            className="w-full items-center justify-center rounded-[12px] border border-orange-500 bg-white px-[10px] py-[16px]">
            <Text className="font-inter-semibold text-[14px] text-orange-500">
              {linkCopied ? '✓ Link tersalin' : 'Bagikan link tagihan'}
            </Text>
          </Pressable>
          <Text className="text-center font-inter text-[10px] text-neutral-500">
            Customer bisa membuka tagihan dari link ini tanpa perlu login. Logo jastip tidak ikut
            tampil di link.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
