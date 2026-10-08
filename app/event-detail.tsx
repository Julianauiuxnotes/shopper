import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import ChartDonutIcon from '@/assets/images/figma/icon-chart-donut.svg';
import ListPlusIcon from '@/assets/images/figma/icon-list-plus.svg';
import MagnifyingGlassIcon from '@/assets/images/figma/icon-magnifying-glass.svg';
import ShareIcon from '@/assets/images/figma/icon-share.svg';
import { TambahPengeluaranSheet } from '@/components/tambah-pengeluaran-sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { MoreMenu } from '@/components/ui/more-menu';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth-store';
import { canExportReport, downloadEventReport } from '@/lib/export-event-report';
import { type Expense, getTotalTagihan, type Order, useEvents } from '@/lib/events-store';
import { formatDate, formatDateRange, formatIDR } from '@/lib/format';
import { buildOrderFormLink } from '@/lib/order-form-link';
import { useSettings } from '@/lib/settings-store';
import * as Clipboard from 'expo-clipboard';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, Share, View } from 'react-native';

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
  const { getEvent, deleteEvent, addExpense, deleteExpense } = useEvents();
  const [addingExpense, setAddingExpense] = React.useState(false);
  const [expenseToDelete, setExpenseToDelete] = React.useState<Expense | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  // Search box: matches the customer's name, any product name, or the
  // order number, ignoring case.
  const [query, setQuery] = React.useState('');
  const needle = query.trim().toLowerCase();
  const searching = needle.length > 0;
  const matchesQuery = (order: Order) =>
    !searching ||
    order.nama.toLowerCase().includes(needle) ||
    order.orderNumber.toLowerCase().includes(needle) ||
    order.items.some((item) => item.namaProduk.toLowerCase().includes(needle));
  const { shop } = useAuth();
  const {
    userProfile,
    adminWhatsapp,
    orderInbox,
    ensureOrderInbox,
    ready: settingsReady,
  } = useSettings();
  const { id, tab: tabParam } = useLocalSearchParams<{ id?: string; tab?: string }>();
  // Laporan (the event's numbers) or List pesanan (the orders). Screens
  // that come back here after working on an order pass `tab=pesanan` so
  // the jastiper lands on the list they left.
  const [tab, setTab] = React.useState<EventTab>(tabParam === 'pesanan' ? 'pesanan' : 'laporan');
  // Which orders the List pesanan tab shows.
  const [paidFilter, setPaidFilter] = React.useState<'lunas' | 'belum'>('belum');
  // Switching tabs slides the white pill across and fades the new content
  // in; switching the paid/unpaid chip fades the list in. The switch
  // itself happens at once — only the look is animated.
  const [reportNotice, setReportNotice] = React.useState('');
  const [tabsWidth, setTabsWidth] = React.useState(0);
  const pillPosition = React.useRef(new Animated.Value(tab === 'pesanan' ? 1 : 0)).current;
  const contentFade = React.useRef(new Animated.Value(1)).current;
  const listFade = React.useRef(new Animated.Value(1)).current;
  const chipPosition = React.useRef(new Animated.Value(0)).current;
  const fadeIn = (value: Animated.Value, duration = TRANSITION_MS) => {
    value.setValue(0);
    Animated.timing(value, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };
  const switchTab = (next: EventTab) => {
    if (next === tab) return;
    setTab(next);
    Animated.timing(pillPosition, {
      toValue: next === 'pesanan' ? 1 : 0,
      duration: TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    fadeIn(contentFade);
  };
  const switchPaidFilter = (next: 'lunas' | 'belum') => {
    if (next === paidFilter) return;
    setPaidFilter(next);
    Animated.timing(chipPosition, {
      toValue: next === 'lunas' ? 1 : 0,
      duration: TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    fadeIn(listFade, LIST_TRANSITION_MS);
  };
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
  const expenses = event?.pengeluaran ?? [];
  const expenseTotal = expenses.reduce((sum, x) => sum + x.jumlah, 0);

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

  // Saves the event's report as an Excel file (lib/export-event-report.ts).
  async function handleDownloadReport() {
    if (!event) return;
    if (!canExportReport) {
      setReportNotice('Download laporan baru tersedia di versi web.');
      return;
    }
    try {
      await downloadEventReport(event);
      setReportNotice('Laporan Excel sudah diunduh.');
    } catch {
      setReportNotice('Laporan gagal dibuat. Coba lagi.');
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
        <Text numberOfLines={1} className="flex-1 font-inter-bold text-[16px] text-[#5d5d5d]">
          {event.namaAcara}
        </Text>
        <MoreMenu
          label="Menu event"
          items={[
            { label: 'Hapus event', destructive: true, onPress: () => setConfirmingDelete(true) },
          ]}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-[20px] px-[20px] pb-[40px] pt-[18px]">
        <View className="gap-[4px]">
          <Text className="font-inter text-[12px] text-black">Kode Event</Text>
          <Text className="font-inter-semibold text-[14px] text-black">{event.kodeEvent}</Text>
        </View>

        {/* The customer order form is a Team feature. Tap the link to copy
            it; the icon opens the share sheet. */}
        {shop?.plan === 'team' ? (
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
        ) : (
          <View className="gap-[4px] rounded-[10px] border border-orange-300 bg-orange-50 p-[10px]">
            <Text className="font-inter-semibold text-[10px] text-orange-600">
              Form order untuk customer
            </Text>
            <Text className="font-inter text-[10px] text-neutral-700">
              Tersedia di paket Team. Ganti paket di Pengaturan Akun untuk membagikan link form
              order ke customer.
            </Text>
          </View>
        )}

        {/* Figma node 221:900: date and place over the event's own photo,
            darkened so the text stays readable; just the dark panel when
            the event has no photo. */}
        <View
          style={BANNER_SHADOW}
          className="h-[118px] justify-end overflow-hidden rounded-[12px]">
          {event.fotoUri ? (
            <Image
              source={{ uri: event.fotoUri }}
              resizeMode="cover"
              className="absolute inset-0 h-full w-full"
            />
          ) : null}
          <View style={BANNER_SHADE} className="absolute inset-0" />
          <View className="gap-[2px] pb-[23px] pl-[17px] pr-[27px]">
            <Text className="font-inter-semibold text-[14px] text-neutral-50">
              {formatDateRange(event.tanggalDari, event.tanggalSampai)}
            </Text>
            <Text numberOfLines={1} className="font-inter-semibold text-[14px] text-neutral-50">
              {event.lokasi}
            </Text>
          </View>
        </View>

        {/* Figma node 221:925. */}
        <View
          accessibilityRole="tablist"
          onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}
          className="flex-row rounded-[99px] bg-neutral-300 p-[5px]">
          {/* The white pill behind the selected tab. Animated.View takes
              no className, hence the inline style. */}
          {tabsWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                TAB_PILL,
                {
                  width: (tabsWidth - 10) / 2,
                  transform: [
                    {
                      translateX: pillPosition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, (tabsWidth - 10) / 2],
                      }),
                    },
                  ],
                },
              ]}
            />
          ) : null}
          <TabButton
            label="Laporan"
            Icon={ChartDonutIcon}
            active={tab === 'laporan'}
            onPress={() => switchTab('laporan')}
          />
          <TabButton
            label="List pesanan"
            Icon={ListPlusIcon}
            active={tab === 'pesanan'}
            onPress={() => switchTab('pesanan')}
          />
        </View>

        <Animated.View style={{ gap: 20, opacity: contentFade }}>
          {tab === 'laporan' ? (
            <>
              {/* Figma node 221:914. */}
              <View className="gap-[24px] rounded-[12px] bg-neutral-200 p-[20px]">
                <View className="gap-[12px]">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-inter-bold text-[14px] text-neutral-900">Keuangan</Text>
                    <MoreMenu
                      label="Menu laporan"
                      items={[
                        {
                          label: 'Edit event detail',
                          onPress: () =>
                            router.push({
                              pathname: '/buka-event-jastip',
                              params: { editId: event.id },
                            }),
                        },
                        { label: 'Download laporan Excel', onPress: handleDownloadReport },
                      ]}
                    />
                  </View>
                  <View className="flex-row gap-[12px]">
                    <Stat label="Jastip budget" value={formatIDR(event.budget ?? 0)} />
                    <Stat label="Pengeluaran" value={formatIDR(expenseTotal)} />
                  </View>
                  <View className="flex-row flex-wrap gap-x-[48px] gap-y-[12px]">
                    <Stat label="Pesanan" value={String(event.totalOrder)} />
                    <Stat label="Revenue" value={formatIDR(event.revenue)} />
                    <Stat label="Profit" value={formatIDR(event.profit)} />
                  </View>
                </View>
                <View className="gap-[12px]">
                  <Text className="font-inter-bold text-[14px] text-neutral-900">
                    Status pembayaran
                  </Text>
                  <View className="flex-row gap-[61px]">
                    <Stat
                      label="Lunas"
                      value={String(lunasOrders.length)}
                      note={formatIDR(lunasTotal)}
                    />
                    <Stat
                      label="Belum Dibayar"
                      value={String(belumOrders.length)}
                      note={formatIDR(belumTotal)}
                    />
                  </View>
                </View>
              </View>

              {reportNotice ? (
                <Text className="font-inter text-[12px] text-neutral-700">{reportNotice}</Text>
              ) : null}

              {/* Figma node 222:950. */}
              <View className="gap-[10px]">
                <Text className="font-inter-semibold text-[16px] text-neutral-800">
                  Pengeluaran
                </Text>
                {expenses.length === 0 ? (
                  <Text className="font-inter text-[10px] italic text-neutral-800">
                    Belum ada pengeluaran
                  </Text>
                ) : (
                  expenses.map((expense) => (
                    <View
                      key={expense.id}
                      className="flex-row items-center gap-[10px] rounded-[8px] bg-neutral-200 p-[10px]">
                      <View className="flex-1 gap-[2px]">
                        <Text numberOfLines={1} className="font-inter text-[12px] text-neutral-900">
                          {expense.nama}
                        </Text>
                        {expense.tanggal ? (
                          <Text className="font-inter text-[10px] text-neutral-700">
                            {formatDate(new Date(expense.tanggal))}
                          </Text>
                        ) : null}
                      </View>
                      <Text className="font-inter-semibold text-[12px] text-neutral-900">
                        {formatIDR(expense.jumlah)}
                      </Text>
                      <Pressable
                        onPress={() => setExpenseToDelete(expense)}
                        accessibilityRole="button"
                        accessibilityLabel={`Hapus pengeluaran ${expense.nama}`}
                        hitSlop={8}>
                        <Text className="font-inter text-[12px] text-red-500">Hapus</Text>
                      </Pressable>
                    </View>
                  ))
                )}
                <Pressable
                  onPress={() => setAddingExpense(true)}
                  accessibilityRole="button"
                  className="self-start rounded-[8px] border border-orange-400 bg-orange-50 p-[10px]">
                  <Text className="font-inter text-[12px] text-orange-500">
                    +Tambah pengeluaran
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Link href={{ pathname: '/tambah-pesanan', params: { eventId: event.id } }} asChild>
                <Pressable className="w-full items-center justify-center rounded-[12px] bg-orange-500 px-[10px] py-[16px]">
                  <Text className="font-inter-semibold text-[14px] text-orange-50">
                    + Tambah pesanan
                  </Text>
                </Pressable>
              </Link>

              {/* Figma node 218:833. Filters both lists below as you type. */}
              <View className="flex-row items-center gap-[10px] rounded-[8px] border border-neutral-400 bg-white px-[10px]">
                <MagnifyingGlassIcon width={16} height={16} />
                <Input
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Cari pesanan dengan nama atau barang"
                  placeholderTextColor="#d1d5db"
                  accessibilityLabel="Cari pesanan"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="h-auto min-h-[37px] min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                />
              </View>

              {/* Figma node 222:1085: one list at a time, paid or unpaid. Three
                layers so the white pill can slide between the chips: the
                grey chip shapes, the pill, then the labels on top. */}
              <View className="flex-row gap-[9px]">
                <View
                  className="absolute bottom-0 left-0 top-0 flex-row gap-[9px]"
                  pointerEvents="none">
                  <View className="w-[136px] rounded-[36px] border border-neutral-300 bg-neutral-200" />
                  <View className="w-[136px] rounded-[36px] border border-neutral-300 bg-neutral-200" />
                </View>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    CHIP_PILL,
                    {
                      transform: [
                        {
                          translateX: chipPosition.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, CHIP_WIDTH + CHIP_GAP],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <FilterChip
                  label="Belum dibayar"
                  active={paidFilter === 'belum'}
                  onPress={() => switchPaidFilter('belum')}
                />
                <FilterChip
                  label="Sudah dibayar"
                  active={paidFilter === 'lunas'}
                  onPress={() => switchPaidFilter('lunas')}
                />
              </View>

              <Animated.View
                style={{
                  opacity: listFade,
                  transform: [
                    {
                      translateY: listFade.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                }}>
                <OrderList
                  searching={searching}
                  orders={(paidFilter === 'lunas' ? lunasOrders : belumOrders).filter(matchesQuery)}
                  eventId={event.id}
                />
              </Animated.View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <TambahPengeluaranSheet
        visible={addingExpense}
        onClose={() => setAddingExpense(false)}
        onSave={(input) => addExpense(event.id, input)}
      />
      <ConfirmDialog
        visible={expenseToDelete !== null}
        title="Hapus pengeluaran?"
        message={`Pengeluaran "${expenseToDelete?.nama ?? ''}" akan dihapus dan tidak bisa dikembalikan.`}
        confirmLabel="Hapus"
        onConfirm={() => {
          if (expenseToDelete) deleteExpense(event.id, expenseToDelete.id);
          setExpenseToDelete(null);
        }}
        onCancel={() => setExpenseToDelete(null)}
      />
      <ConfirmDialog
        visible={confirmingDelete}
        title="Hapus event?"
        message={
          event.orders.length > 0
            ? `Event "${event.namaAcara}" dan ${event.orders.length} pesanan di dalamnya akan dihapus dari semua perangkat toko ini dan tidak bisa dikembalikan.`
            : `Event "${event.namaAcara}" akan dihapus dari semua perangkat toko ini dan tidak bisa dikembalikan.`
        }
        confirmLabel="Hapus"
        onConfirm={() => {
          // Leaves the screen first, then deletes: the event this screen
          // is showing must not vanish from under it.
          setConfirmingDelete(false);
          router.replace('/dashboard');
          deleteEvent(event.id);
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </View>
  );
}

type EventTab = 'laporan' | 'pesanan';

const BANNER_SHADOW = { boxShadow: '0px 4px 6.1px rgba(0, 0, 0, 0.25)' };
// Both spellings: `backgroundImage` is what the web build reads, the
// experimental one what native does.
const BANNER_GRADIENT = 'linear-gradient(to bottom, rgba(102,102,102,0.8), rgba(0,0,0,0.8))';
const BANNER_SHADE = {
  backgroundImage: BANNER_GRADIENT,
  experimental_backgroundImage: BANNER_GRADIENT,
} as object;

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View className="gap-[4px]">
      <Text className="font-inter text-[12px] text-neutral-900">{label}</Text>
      <Text className="font-inter-semibold text-[14px] text-neutral-900">{value}</Text>
      {note ? <Text className="font-inter text-[12px] text-neutral-900">{note}</Text> : null}
    </View>
  );
}

function TabButton({
  label,
  Icon,
  active,
  onPress,
}: {
  label: string;
  Icon: React.ComponentType<{ width: number; height: number; color: string }>;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      aria-selected={active}
      className="flex-1 flex-row items-center justify-center gap-[10px] rounded-[36px] border border-transparent px-[16px] py-[6px]">
      <Icon width={24} height={24} color={active ? '#1f2937' : '#4b5563'} />
      <Text
        className={
          active
            ? 'font-inter-semibold text-[14px] text-neutral-900'
            : 'font-inter-semibold text-[14px] text-neutral-700'
        }>
        {label}
      </Text>
    </Pressable>
  );
}

const TRANSITION_MS = 220;
const TAB_PILL = {
  position: 'absolute',
  top: 5,
  bottom: 5,
  left: 5,
  borderRadius: 36,
  borderWidth: 1,
  borderColor: '#e5e7eb',
  backgroundColor: '#fafafa',
  boxShadow: '0px 4px 4.1px rgba(0, 0, 0, 0.15)',
} as const;

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      aria-pressed={active}
      className="w-[136px] items-center justify-center rounded-[36px] border border-transparent px-[16px] py-[6px]">
      <Text className="font-inter-semibold text-[14px] text-neutral-700">{label}</Text>
    </Pressable>
  );
}

const CHIP_WIDTH = 136;
const CHIP_GAP = 9;
const LIST_TRANSITION_MS = 300;
const CHIP_PILL = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  width: CHIP_WIDTH,
  borderRadius: 36,
  backgroundColor: '#fafafa',
  boxShadow: '0px 4px 4.25px rgba(0, 0, 0, 0.15)',
} as const;

function OrderList({
  orders,
  eventId,
  searching,
}: {
  orders: Order[];
  eventId: string;
  /** A search is active, so an empty list means "no match", not "no orders". */
  searching: boolean;
}) {
  return (
    <View className="gap-[8px]">
      {orders.length === 0 ? (
        <Text className="font-inter text-[10px] italic text-neutral-800">
          {searching ? 'Tidak ada pesanan yang cocok' : 'Belum ada pesanan'}
        </Text>
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
