import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import ShareIcon from '@/assets/images/figma/icon-share.svg';
import { Text } from '@/components/ui/text';
import { getTotalTagihan, type Order, useEvents } from '@/lib/events-store';
import { formatDateRange, formatIDR } from '@/lib/format';
import { buildOrderFormLink } from '@/lib/order-form-link';
import { useSettings } from '@/lib/settings-store';
import * as Clipboard from 'expo-clipboard';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Image, Pressable, ScrollView, Share, View } from 'react-native';

// Figma section BUKA EVENT JASTIP, node 53:3113 "After click Simpan" —
// the event detail screen a jastiper lands on right after creating an
// event. Reads the event from the shared store (lib/events-store.tsx) by
// id, rather than route params, so Dashboard's future "Lihat detail"
// links can reach the same screen. The mockup's stock plaza photo
// (`imgRectangle2`, between the share box and Tanggal acara/Lokasi) isn't
// copied — instead the event's OWN uploaded `fotoUri` renders there when
// one exists (set via expo-image-picker in buka-event-jastip.tsx), and
// the whole block is omitted for events with no photo (it's optional),
// rather than showing a fake placeholder.
export default function EventDetailScreen() {
  const router = useRouter();
  const { getEvent } = useEvents();
  const {
    userProfile,
    adminWhatsapp,
    orderInbox,
    ensureOrderInbox,
    ready: settingsReady,
  } = useSettings();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const event = id ? getEvent(id) : undefined;

  // The customer order form for this event (app/o.tsx). The link carries
  // the event's details itself (lib/order-form-link.ts) plus the id of
  // this jastiper's order inbox, where submitted orders are sent — so
  // there's no link until the inbox exists. The contact number shown on
  // the customer's bukti is the admin number from Pengaturan Publikasi if
  // set, else the jastiper's own from Pengaturan.
  React.useEffect(() => {
    if (settingsReady && !orderInbox) ensureOrderInbox().catch(() => {});
  }, [settingsReady, orderInbox, ensureOrderInbox]);
  const shareLink =
    event && orderInbox
      ? buildOrderFormLink(event, {
          namaJastip: userProfile.namaJastip || 'Jastip by Juli',
          whatsapp: adminWhatsapp || userProfile.telepon || '',
          inboxId: orderInbox.id,
        })
      : '';
  const [linkCopied, setLinkCopied] = React.useState(false);
  const lunasOrders = event?.orders.filter((o) => o.statusPembayaran === 'lunas') ?? [];
  const belumOrders = event?.orders.filter((o) => o.statusPembayaran === 'belum') ?? [];
  // Receivable per status: what customers have paid vs. still owe.
  const lunasTotal = lunasOrders.reduce((sum, o) => sum + getTotalTagihan(o), 0);
  const belumTotal = belumOrders.reduce((sum, o) => sum + getTotalTagihan(o), 0);

  async function handleCopyLink() {
    if (!shareLink) return;
    try {
      await Clipboard.setStringAsync(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // clipboard blocked — the share icon still works.
    }
  }

  async function handleShare() {
    if (!shareLink || !event) return;
    try {
      await Share.share({
        message: `Yuk order di ${event.namaAcara}! Isi form pesanan di sini:\n${shareLink}`,
      });
    } catch {
      // No share sheet (most desktop browsers) or dismissed; copying is
      // the useful fallback either way.
      handleCopyLink();
    }
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center gap-[8px] bg-white px-[20px]">
        <Text className="font-inter-bold text-[16px] text-neutral-900">Event tidak ditemukan</Text>
        <Pressable onPress={() => router.replace('/dashboard')}>
          <Text className="font-inter-semibold text-[14px] text-orange-500">
            Kembali ke Dashboard
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center gap-[5px] px-[20px] pt-[20px]">
        <Pressable onPress={() => router.replace('/dashboard')} hitSlop={8}>
          <CaretCircleLeftIcon width={24} height={24} />
        </Pressable>
        <Text className="font-inter-bold text-[16px] text-[#5d5d5d]">{event.namaAcara}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-[20px] px-[20px] pb-[40px] pt-[18px]">
        <View className="gap-[4px]">
          <Text className="font-inter text-[12px] text-black">Kode Event</Text>
          <Text className="font-inter-semibold text-[14px] text-black">{event.kodeEvent}</Text>
        </View>

        {/* Tap the link to copy it; the icon opens the share sheet. */}
        <View className="gap-[10px] rounded-[10px] bg-orange-500 p-[10px]">
          <Text className="font-inter-semibold text-[10px] text-neutral-50">
            Bagikan form order jastip
          </Text>
          <View className="flex-row items-center gap-[10px]">
            <Pressable
              onPress={handleCopyLink}
              accessibilityRole="button"
              accessibilityLabel="Salin link form order"
              className="flex-1 rounded-[7px] bg-white p-[4px]">
              <Text numberOfLines={1} className="font-inter text-[10px] text-[#5d5d5d]">
                {linkCopied ? '✓ Link tersalin' : shareLink || 'Menyiapkan link...'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Bagikan link form order"
              hitSlop={8}>
              <ShareIcon width={25} height={25} />
            </Pressable>
          </View>
        </View>

        {event.fotoUri ? (
          <Image
            source={{ uri: event.fotoUri }}
            resizeMode="cover"
            className="h-[118px] w-full rounded-[12px]"
          />
        ) : null}

        <View className="gap-[16px] rounded-[12px] bg-orange-200 p-[20px]">
          <View className="gap-[4px]">
            <Text className="font-inter text-[12px] text-neutral-800">Tanggal acara</Text>
            <Text className="font-inter-semibold text-[14px] text-neutral-800">
              {formatDateRange(event.tanggalDari, event.tanggalSampai)}
            </Text>
          </View>
          <View className="gap-[4px]">
            <Text className="font-inter text-[12px] text-neutral-800">Lokasi</Text>
            <Text className="font-inter-semibold text-[14px] text-neutral-800">{event.lokasi}</Text>
          </View>
        </View>

        <View className="gap-[16px] rounded-[12px] bg-orange-200 p-[20px]">
          <View className="flex-row justify-between">
            <View className="gap-[4px]">
              <Text className="font-inter text-[12px] text-neutral-800">Pesanan</Text>
              <Text className="font-inter-semibold text-[14px] text-neutral-800">
                {event.totalOrder}
              </Text>
            </View>
            <View className="gap-[4px]">
              <Text className="font-inter text-[12px] text-neutral-800">Revenue</Text>
              <Text className="font-inter-semibold text-[14px] text-neutral-800">
                {formatIDR(event.revenue)}
              </Text>
            </View>
            <View className="gap-[4px]">
              <Text className="font-inter text-[12px] text-neutral-800">Profit</Text>
              <Text className="font-inter-semibold text-[14px] text-neutral-800">
                {formatIDR(event.profit)}
              </Text>
            </View>
          </View>
          <View className="gap-[4px]">
            <Text className="font-inter text-[12px] text-neutral-800">Status pembayaran</Text>
            <View className="flex-row gap-[80px]">
              <View className="gap-[4px]">
                <Text className="font-inter-semibold text-[12px] text-neutral-800">Lunas</Text>
                <Text className="font-inter-semibold text-[14px] text-neutral-800">
                  {lunasOrders.length}
                </Text>
                <Text className="font-inter text-[12px] text-neutral-800">
                  {formatIDR(lunasTotal)}
                </Text>
              </View>
              <View className="gap-[4px]">
                <Text className="font-inter-semibold text-[12px] text-neutral-800">
                  Belum Dibayar
                </Text>
                <Text className="font-inter-semibold text-[14px] text-neutral-800">
                  {belumOrders.length}
                </Text>
                <Text className="font-inter text-[12px] text-neutral-800">
                  {formatIDR(belumTotal)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Link href={{ pathname: '/tambah-pesanan', params: { eventId: event.id } }} asChild>
          <Pressable className="w-full items-center justify-center rounded-[12px] bg-orange-500 px-[10px] py-[16px]">
            <Text className="font-inter-semibold text-[14px] text-orange-50">+ Tambah pesanan</Text>
          </Pressable>
        </Link>

        <OrderListSection
          title="List Pesanan sudah dibayar:"
          orders={lunasOrders}
          eventId={event.id}
        />
        <OrderListSection
          title="List Pesanan belum dibayar:"
          orders={belumOrders}
          eventId={event.id}
        />
      </ScrollView>
    </View>
  );
}

function OrderListSection({
  title,
  orders,
  eventId,
}: {
  title: string;
  orders: Order[];
  eventId: string;
}) {
  return (
    <View className="gap-[8px]">
      <Text className="font-inter-semibold text-[12px] text-neutral-800">{title}</Text>
      {orders.length === 0 ? (
        <Text className="font-inter text-[10px] italic text-neutral-800">Belum ada pesanan</Text>
      ) : (
        <View className="gap-[8px]">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={{ pathname: '/order-detail', params: { eventId, orderId: order.id } }}
              asChild>
              <Pressable className="flex-row items-center justify-between rounded-[8px] bg-orange-50 p-[10px]">
                <View className="gap-[2px]">
                  <Text className="font-inter-semibold text-[12px] text-neutral-800">
                    {order.orderNumber} · {order.nama}
                    {order.sumber === 'customer' && order.totalPembayaran === 0
                      ? ' · dari form customer, isi harga'
                      : ''}
                  </Text>
                  <Text className="font-inter text-[10px] text-neutral-600">
                    {order.items.length} barang · {formatIDR(order.totalPembayaran)}
                  </Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </View>
  );
}
