import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { JastiperLogo } from '@/components/jastiper-logo';
import { TagihanReceipt } from '@/components/tagihan-receipt';
import { Text } from '@/components/ui/text';
import { useEvents } from '@/lib/events-store';
import { useLanguage } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import {
  buildReceiptLink,
  buildReceiptSnapshot,
  createShortReceiptLink,
  encodeReceiptSnapshot,
} from '@/lib/receipt-link';
import {
  canMakeReceiptImage,
  printReceiptImage,
  renderReceiptPng,
  saveReceiptImage,
} from '@/lib/receipt-image';
import { useSettings } from '@/lib/settings-store';
import { tagihanBlocks } from '@/lib/tagihan-image';
import { useAutoReset } from '@/lib/use-auto-reset';
import { cn } from '@/lib/utils';
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
  const { userProfile, logoJastip } = useSettings();
  const { t, language } = useLanguage();
  const { eventId, orderId } = useLocalSearchParams<{ eventId?: string; orderId?: string }>();
  const event = eventId ? getEvent(eventId) : undefined;
  const order = eventId && orderId ? getOrder(eventId, orderId) : undefined;
  const printedAt = React.useMemo(() => new Date(), []);
  const [linkCopied, setLinkCopied] = React.useState(false);
  useAutoReset(linkCopied, () => setLinkCopied(false));

  const snapshot = React.useMemo(
    () =>
      event && order
        ? buildReceiptSnapshot(
            event,
            order,
            {
              namaJastip: userProfile.namaJastip || 'Jastip by Juli',
              telepon: userProfile.telepon ?? '',
              alamat: userProfile.alamat ?? '',
              rekening: userProfile.rekening ?? [],
            },
            printedAt
          )
        : null,
    [event, order, userProfile, printedAt]
  );

  // The short link (app.justipers.com/r#k7Qm2xPa3B) is made as soon as the
  // screen opens, so the buttons can open WhatsApp or the share sheet
  // straight from the tap (mobile browsers block both after a wait). If
  // the server doesn't answer within 5 s, the full link is used instead.
  // See lib/receipt-link.ts.
  const billKey = snapshot ? encodeReceiptSnapshot(snapshot) : '';
  const [shortLink, setShortLink] = React.useState<string | null>(null);
  const [linkReady, setLinkReady] = React.useState(false);
  React.useEffect(() => {
    if (!snapshot) return;
    let alive = true;
    setShortLink(null);
    setLinkReady(false);
    const fallback = setTimeout(() => alive && setLinkReady(true), 5000);
    createShortReceiptLink(snapshot)
      .then((link) => alive && setShortLink(link))
      .catch(() => {})
      .finally(() => {
        clearTimeout(fallback);
        if (alive) setLinkReady(true);
      });
    return () => {
      alive = false;
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billKey, language]);

  // "Cetak" and "Simpan foto tagihan": the bill as a 58 mm thermal receipt
  // image (lib/tagihan-image.ts, lib/receipt-image.ts), drawn as soon as
  // the screen opens so the tap can open the share sheet straight away.
  const [png, setPng] = React.useState<Blob | null>(null);
  const [photoNotice, setPhotoNotice] = React.useState('');
  useAutoReset(photoNotice === 'saved', () => setPhotoNotice(''));
  React.useEffect(() => {
    if (!snapshot || !canMakeReceiptImage) return;
    let alive = true;
    setPng(null);
    renderReceiptPng(tagihanBlocks(snapshot, logoJastip))
      .then((blob) => alive && setPng(blob))
      .catch(() => alive && setPhotoNotice('failed'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billKey, language, logoJastip]);

  if (!event || !order) {
    return (
      <View className="flex-1 items-center justify-center gap-[8px] bg-white px-[20px]">
        <Text className="font-inter-bold text-[16px] text-neutral-900">
          {t('Pesanan tidak ditemukan')}
        </Text>
        <Pressable onPress={() => router.replace('/dashboard')}>
          <Text className="font-inter-semibold text-[14px] text-orange-500">
            {t('Kembali ke Dashboard')}
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

  const bill = snapshot!;
  const shareLink = shortLink ?? buildReceiptLink(bill);

  // The customer opens this link to see the same receipt on a public page
  // (app/r.tsx) — no Justipers account needed, see lib/receipt-link.ts.
  function buildShareMessage() {
    return t(
      'Hi {customer}! Ini tagihan pesananmu dari {jastip} ({order}), total {total}. Lihat rinciannya di sini:\n{link}',
      {
        customer: order!.nama,
        jastip: bill.nj,
        order: bill.on,
        total: formatMoney(bill.tt),
        link: shareLink,
      }
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
        await navigator.clipboard.writeText(shareLink);
        setLinkCopied(true);
      } catch {
        // clipboard blocked — nothing else to do here.
      }
    }
  }

  function handleCetak() {
    if (!canMakeReceiptImage) {
      setPhotoNotice('webOnly');
      return;
    }
    if (png) printReceiptImage(png);
  }

  async function handleSimpanFoto() {
    if (!canMakeReceiptImage) {
      setPhotoNotice('webOnly');
      return;
    }
    if (!png) return;
    const safeName = bill.cn.replace(/[^\w\- ]+/g, '').trim();
    const result = await saveReceiptImage(png, `${t('Tagihan')} ${bill.on} ${safeName}.png`);
    if (result !== 'cancelled') setPhotoNotice('saved');
  }

  const imageBusy = canMakeReceiptImage && !png;

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerClassName="items-center pb-[24px]">
        <Pressable onPress={handleBack} hitSlop={8} className="w-full px-[16px] pt-[20px]">
          <CaretCircleLeftIcon width={24} height={24} />
        </Pressable>
        <TagihanReceipt snapshot={bill} logo={<JastiperLogo />} />

        <View className="w-full max-w-[390px] gap-[10px] px-[16px] pt-[8px]">
          <Pressable
            onPress={handleKirimWhatsapp}
            disabled={!linkReady}
            accessibilityRole="button"
            accessibilityState={{ disabled: !linkReady }}
            className={cn(
              'w-full items-center justify-center rounded-[12px] bg-orange-500 px-[10px] py-[16px]',
              !linkReady && 'opacity-60'
            )}>
            <Text className="font-inter-semibold text-[14px] text-orange-50">
              {t('Kirim ke WhatsApp customer')}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleBagikanLink}
            disabled={!linkReady}
            accessibilityRole="button"
            accessibilityState={{ disabled: !linkReady }}
            className={cn(
              'w-full items-center justify-center rounded-[12px] border border-orange-500 bg-white px-[10px] py-[16px]',
              !linkReady && 'opacity-60'
            )}>
            <Text className="font-inter-semibold text-[14px] text-orange-500">
              {linkCopied ? t('✓ Link tersalin') : t('Bagikan link tagihan')}
            </Text>
          </Pressable>
          <Text className="text-center font-inter text-[10px] text-neutral-500">
            {linkReady
              ? t(
                  'Customer bisa membuka tagihan dari link ini tanpa perlu login. Logo jastip tidak ikut tampil di link.'
                )
              : t('Menyiapkan link tagihan…')}
          </Text>

          {/* 58 mm thermal printer: print here, or save the image for the
              printer's own app (iPhone Safari can't reach the printer). */}
          <View className="mt-[14px] h-px w-full bg-neutral-300" />
          <View className="mt-[14px] flex-row gap-[10px]">
            <Pressable
              onPress={handleCetak}
              disabled={imageBusy}
              accessibilityRole="button"
              className={cn(
                'flex-1 items-center justify-center rounded-[12px] border border-neutral-800 bg-white px-[10px] py-[14px]',
                imageBusy && 'opacity-50'
              )}>
              <Text className="font-inter-semibold text-[14px] text-neutral-800">{t('Cetak')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSimpanFoto}
              disabled={imageBusy}
              accessibilityRole="button"
              className={cn(
                'flex-1 items-center justify-center rounded-[12px] border border-neutral-800 bg-white px-[10px] py-[14px]',
                imageBusy && 'opacity-50'
              )}>
              <Text className="font-inter-semibold text-[14px] text-neutral-800">
                {photoNotice === 'saved' ? t('✓ Tersimpan') : t('Simpan foto tagihan')}
              </Text>
            </Pressable>
          </View>
          <Text className="text-center font-inter text-[10px] text-neutral-500">
            {photoNotice === 'webOnly'
              ? t('Cetak dan simpan foto baru tersedia di versi web.')
              : photoNotice === 'failed'
                ? t('Foto tagihan gagal dibuat. Coba lagi.')
                : t('Ukuran struk printer thermal 58 mm.')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
