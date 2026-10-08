import CameraIcon from '@/assets/images/figma/icon-camera.svg';
import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import CaretDownIcon from '@/assets/images/figma/icon-caret-down.svg';
import CheckSquareIcon from '@/assets/images/figma/icon-check-square.svg';
import PrinterIcon from '@/assets/images/figma/icon-printer.svg';
import XCircleIcon from '@/assets/images/figma/icon-x-circle.svg';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MoreMenu } from '@/components/ui/more-menu';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  computeItemTotals,
  useEvents,
  type JastipEvent,
  type Order,
  type OrderItem,
  getSisaPembayaran,
  type PaymentStatus,
} from '@/lib/events-store';
import { formatIDR } from '@/lib/format';
import { compressPhoto } from '@/lib/compress-image';
import { ONGKIR_OPTIONS } from '@/lib/ongkir';
import { cn } from '@/lib/utils';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as React from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, View } from 'react-native';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// Same options/labels as Tambah Pesanan's own Fee Jastip type toggle
// (app/tambah-pesanan.tsx) — the confirm sheet's Fee Jastip field is
// built to match that screen exactly, not just visually.
const FEE_TYPE_OPTIONS = [
  ['percent', 'Pakai %'],
  ['flat', 'Pakai IDR'],
] as const;

function parseNumber(s: string) {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

type ConfirmDraft = {
  namaProduk: string;
  jumlah: string;
  harga: string;
  feeType: 'percent' | 'flat';
  feeValue: string;
};

// Figma node 118:14 "Detil pesanan / KONFIRMASI PESANAN SUDAH DIBELI".
// Reached by tapping an order row in Event Detail's order lists. Shows
// the real order from the shared store (lib/events-store.tsx), not the
// mockup's sample data (Nadine / Jl. Sriwijaya / Nivea B1G1 etc).
//
// Each item's pill button is a plain action label — "Sudah dibeli"
// always, not a toggle reflecting state (the Figma mockup itself shows
// this exact label on items regardless of their checked state, node
// 105:4790) — tapping it opens a slide-in confirmation sheet (node
// 105:4790's own bottom panel, "Konfirmasi barang sudah dibeli")
// instead of flipping `dibeli` directly. The checkbox next to the item
// name stays permanently empty/unchecked — Figma renders it unfilled in
// BOTH the not-yet-bought (105:4790) and already-bought (105:5015)
// states, so it's a static visual marker in the design, not a live
// `dibeli` indicator. The sheet's Nama produk/Jumlah/Harga/Fee Jastip
// are all editable, autofilled from the item's current values via
// `confirmDraft` state (not written to the store on every keystroke
// like Nama/Alamat/No. Whatsapp below — these only commit on "Tandai
// sudah beli", since a half-typed Harga would otherwise briefly corrupt
// the order's totals). Fee Jastip specifically mirrors Tambah Pesanan's
// own field exactly: a "Pakai %"/"Pakai IDR" anchored dropdown trigger
// (measured via `Pressable.measure()`, rendered through a `Modal` so it
// layers above the BottomSheet) next to an editable value Input — same
// `FEE_TYPE_OPTIONS`/interaction, not a decorative read-only look.
// "Tandai sudah beli" calls `updateOrderItem`, which recomputes this
// item's subtotal/fee delta and applies it to both the order's own
// totals AND the event's revenue/profit aggregates, so editing here
// can't silently desync them. Also lets the jastiper attach a "Foto
// struk" (receipt photo, optional, same expo-image-picker pattern as
// Buka Event Jastip's event photo) before confirming, which also sets
// `dibeli: true`. Per Figma node 105:5015, once an item is confirmed
// WITH a photo, its row swaps the pill for the photo thumbnail + a
// "Cetak penanda" (print marker) button — a TODO stub for now, since no
// printer integration exists in this app. An item confirmed WITHOUT a
// photo keeps showing the "Sudah dibeli" pill — always the same plain
// outline style regardless of `dibeli`, matching every Figma reference
// pulled for this screen, which never shows it filled in any state —
// still tappable, to let the jastiper reopen and add a photo later.
// "+Tambah" (Figma node
// 174:429, "Tambah list pesanan") opens a second, separate sheet that
// adds a brand new item to the order via `addOrderItem` — same
// aggregate-sync principle as `updateOrderItem`, previously a known
// gap, now resolved.
//
// Nama/Alamat/No. Whatsapp are editable. Like everything else on this
// screen, edits go into a working copy and are only stored when "Simpan"
// is pressed (see OrderDetailContent).
export default function OrderDetailScreen() {
  const router = useRouter();
  const { getEvent, getOrder } = useEvents();
  const { eventId, orderId } = useLocalSearchParams<{ eventId?: string; orderId?: string }>();
  const event = eventId ? getEvent(eventId) : undefined;
  const order = eventId && orderId ? getOrder(eventId, orderId) : undefined;

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

  return <OrderDetailContent event={event} order={order} />;
}

// Split out from the screen above so every hook below runs
// unconditionally — the "not found" early return used to sit above
// them, which broke the Rules of Hooks whenever the order appeared a
// render late (e.g. on reload, while the events store is still loading).
//
// Nothing on this screen is saved until "Simpan" is pressed. `order` below
// is a working copy that every field, toggle and item sheet edits;
// `savedOrder` is what the store holds. Simpan writes the copy back in
// one go (and the sync then sends it to the shop's other devices).
function OrderDetailContent({ event, order: savedOrder }: { event: JastipEvent; order: Order }) {
  const router = useRouter();
  const { saveOrder, deleteOrder } = useEvents();
  const [order, setOrder] = React.useState(savedOrder);
  const [justSaved, setJustSaved] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = React.useState(false);
  const [confirmingLunas, setConfirmingLunas] = React.useState(false);

  const isDirty = JSON.stringify(order) !== JSON.stringify(savedOrder);

  // While there are no unsaved edits, follow the stored order, so a change
  // synced in from another device shows up here too. With unsaved edits,
  // the working copy is kept and wins when Simpan is pressed.
  const dirtyRef = React.useRef(isDirty);
  dirtyRef.current = isDirty;
  React.useEffect(() => {
    if (!dirtyRef.current) setOrder(savedOrder);
  }, [savedOrder]);

  function editOrder(updater: (order: Order) => Order) {
    setOrder(updater);
    setJustSaved(false);
  }

  // Item edits change the order's own totals, so those are recomputed
  // from the items each time.
  function editItems(updater: (items: OrderItem[]) => OrderItem[]) {
    editOrder((o) => {
      const items = updater(o.items);
      let totalPembayaran = 0;
      let profit = 0;
      for (const item of items) {
        const { subtotal, fee } = computeItemTotals(item);
        totalPembayaran += subtotal;
        profit += fee;
      }
      return { ...o, items, totalPembayaran, profit };
    });
  }

  function handleSave() {
    if (!isDirty) return;
    saveOrder(event.id, order);
    setJustSaved(true);
  }

  // The back arrow: straight to the event when there's nothing to lose,
  // otherwise ask first.
  function goToEvent() {
    router.replace({ pathname: '/event-detail', params: { id: event.id, tab: 'pesanan' } });
  }

  // Leaves the screen first, then deletes: the order this screen is
  // showing must not vanish from under it.
  function handleDeleteOrder() {
    setConfirmingDelete(false);
    router.replace({ pathname: '/event-detail', params: { id: event.id, tab: 'pesanan' } });
    deleteOrder(event.id, order.id);
  }
  const [confirmingItemId, setConfirmingItemId] = React.useState<string | null>(null);
  const [confirmDraft, setConfirmDraft] = React.useState<ConfirmDraft | null>(null);
  const [fotoStrukDraft, setFotoStrukDraft] = React.useState<string | null>(null);
  const feeTriggerRef = React.useRef<React.ElementRef<typeof Pressable> | null>(null);
  const [feeDropdownAnchor, setFeeDropdownAnchor] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  function openConfirm(itemId: string) {
    const item = order!.items.find((it) => it.id === itemId);
    if (!item) return;
    setConfirmDraft({
      namaProduk: item.namaProduk,
      jumlah: String(item.jumlah),
      harga: String(item.harga),
      feeType: item.feeType,
      feeValue: String(item.feeValue),
    });
    setFotoStrukDraft(item.fotoStruk);
    setConfirmingItemId(itemId);
  }

  function updateConfirmDraft(patch: Partial<ConfirmDraft>) {
    setConfirmDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function openFeeDropdown() {
    feeTriggerRef.current?.measure((_fx, _fy, width, height, pageX, pageY) => {
      setFeeDropdownAnchor({ x: pageX, y: pageY, width, height });
    });
  }

  const isConfirmValid =
    !!confirmDraft &&
    confirmDraft.namaProduk.trim().length > 0 &&
    parseNumber(confirmDraft.jumlah) > 0 &&
    parseNumber(confirmDraft.harga) > 0;

  async function handlePickFotoStruk() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin dibutuhkan', 'Aktifkan akses foto di pengaturan untuk memilih foto struk.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.mimeType && !ALLOWED_MIME_TYPES.includes(asset.mimeType)) {
      Alert.alert('Format tidak didukung', 'Pilih foto berformat JPG, JPEG, atau PNG.');
      return;
    }

    // Shrunk to ~200 KB before it's stored anywhere (lib/compress-image.ts).
    try {
      const compressed = await compressPhoto(asset);
      setFotoStrukDraft(compressed.uri);
    } catch {
      Alert.alert('Gagal', 'Foto tidak berhasil diproses. Coba pilih foto lain.');
    }
  }

  function handleBuatPesanan(close: () => void) {
    if (!confirmingItemId || !confirmDraft || !isConfirmValid) return;
    const updates = {
      namaProduk: confirmDraft.namaProduk.trim(),
      jumlah: parseNumber(confirmDraft.jumlah),
      harga: parseNumber(confirmDraft.harga),
      // Prices here are edited in IDR, so a foreign price typed in Tambah
      // pesanan no longer describes the item.
      hargaAsing: undefined,
      feeType: confirmDraft.feeType,
      feeValue: parseNumber(confirmDraft.feeValue),
      dibeli: true,
      fotoStruk: fotoStrukDraft,
    };
    editItems((items) =>
      items.map((item) => (item.id === confirmingItemId ? { ...item, ...updates } : item))
    );
    close();
  }

  // "Tambah list pesanan" (Figma node 174:429) — adds a NEW item to this
  // already-submitted order, separate state/handlers from the confirm
  // sheet above (editing an existing item) even though both share the
  // same `ConfirmDraft` shape and Fee Jastip dropdown mechanics, since
  // they can't be open at the same time but ARE conceptually different
  // actions (add vs. edit). Resolves the long-standing "+Tambah" TODO:
  // The new item goes into the working copy (editItems), which
  // recomputes the order's totals; the event's are recomputed on Simpan.
  const [addingItem, setAddingItem] = React.useState(false);
  const [addItemDraft, setAddItemDraft] = React.useState<ConfirmDraft>({
    namaProduk: '',
    jumlah: '',
    harga: '',
    feeType: 'percent',
    feeValue: '',
  });
  const [addFotoStrukDraft, setAddFotoStrukDraft] = React.useState<string | null>(null);
  const addFeeTriggerRef = React.useRef<React.ElementRef<typeof Pressable> | null>(null);
  const [addFeeDropdownAnchor, setAddFeeDropdownAnchor] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  function openAddItem() {
    setAddItemDraft({ namaProduk: '', jumlah: '', harga: '', feeType: 'percent', feeValue: '' });
    setAddFotoStrukDraft(null);
    setAddingItem(true);
  }

  function updateAddItemDraft(patch: Partial<ConfirmDraft>) {
    setAddItemDraft((d) => ({ ...d, ...patch }));
  }

  function openAddFeeDropdown() {
    addFeeTriggerRef.current?.measure((_fx, _fy, width, height, pageX, pageY) => {
      setAddFeeDropdownAnchor({ x: pageX, y: pageY, width, height });
    });
  }

  const isAddItemValid =
    addItemDraft.namaProduk.trim().length > 0 &&
    parseNumber(addItemDraft.jumlah) > 0 &&
    parseNumber(addItemDraft.harga) > 0;

  async function handlePickAddFotoStruk() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin dibutuhkan', 'Aktifkan akses foto di pengaturan untuk memilih foto struk.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.mimeType && !ALLOWED_MIME_TYPES.includes(asset.mimeType)) {
      Alert.alert('Format tidak didukung', 'Pilih foto berformat JPG, JPEG, atau PNG.');
      return;
    }

    // Shrunk to ~200 KB before it's stored anywhere (lib/compress-image.ts).
    try {
      const compressed = await compressPhoto(asset);
      setAddFotoStrukDraft(compressed.uri);
    } catch {
      Alert.alert('Gagal', 'Foto tidak berhasil diproses. Coba pilih foto lain.');
    }
  }

  function handleAddItem(close: () => void, dibeli: boolean) {
    if (!isAddItemValid) return;
    const added = {
      namaProduk: addItemDraft.namaProduk.trim(),
      jumlah: parseNumber(addItemDraft.jumlah),
      harga: parseNumber(addItemDraft.harga),
      feeType: addItemDraft.feeType,
      feeValue: parseNumber(addItemDraft.feeValue),
      dibeli,
      fotoStruk: addFotoStrukDraft,
    };
    editItems((items) => [...items, { ...added, id: `${order.id}-${items.length}` }]);
    close();
  }

  function handleCetakPenanda(itemId: string) {
    // Figma node 105:5015's "Cetak penanda" button — opens the
    // print-preview screen (Figma section 176:726, app/cetak-penanda.tsx)
    // for this specific item.
    router.push({
      pathname: '/cetak-penanda',
      params: { eventId: event!.id, orderId: order!.id, itemId },
    });
  }

  // Tapping a photo thumbnail opens it full-size in this Modal rather
  // than navigating anywhere, since it's just a closer look at data
  // already on this screen. `previewPhoto` holds the tapped item's
  // fotoStruk URI (null = closed).
  const [previewPhoto, setPreviewPhoto] = React.useState<string | null>(null);

  async function handleDownloadPhoto() {
    if (!previewPhoto) return;
    if (Platform.OS === 'web') {
      // On web the picked photo is already a browser-addressable
      // blob:/data: URI — a plain anchor download triggers the
      // browser's own save dialog, no extra permission needed.
      const a = document.createElement('a');
      a.href = previewPhoto;
      a.download = 'foto-struk.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Dynamic import, not a top-level one: expo-media-library's default
    // export calls requireNativeModule() at module-evaluation time with
    // no web fallback, which crashes the whole web bundle on load if
    // imported statically. Deferring to here — reached only on native,
    // since the web branch above already returned — means it's never
    // evaluated at all on web.
    const MediaLibrary = await import('expo-media-library');
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin dibutuhkan', 'Aktifkan akses galeri untuk menyimpan foto struk.');
      return;
    }
    try {
      await MediaLibrary.saveToLibraryAsync(previewPhoto);
      Alert.alert('Berhasil', 'Foto struk tersimpan ke galeri.');
    } catch {
      Alert.alert('Gagal', 'Foto struk tidak berhasil disimpan.');
    }
  }

  function setNama(nama: string) {
    editOrder((o) => ({ ...o, nama }));
  }

  function setAlamat(alamat: string) {
    editOrder((o) => ({ ...o, alamat }));
  }

  // Orders store the full number ("+62" + local digits, see
  // tambah-pesanan.tsx); the field shows "+62" as a fixed prefix and only
  // the local part is editable (Figma node 181:545).
  const whatsappLocal = order.whatsapp.replace(/^\+62/, '');

  function setWhatsapp(local: string) {
    // Digits only, and no leading 0 — "0812…" after +62 isn't a valid number.
    const whatsapp = `+62${local.replace(/\D/g, '').replace(/^0+/, '')}`;
    editOrder((o) => ({ ...o, whatsapp }));
  }

  function setMetodePengiriman(metode: 'instant' | 'ekspedisi') {
    editOrder((o) => ({ ...o, metodePengiriman: metode }));
  }

  // The two options are mutually exclusive; tapping the ticked one
  // again clears it (back to Figma's "Default" state, node 181:528).
  function togglePembayaranOngkir(value: NonNullable<Order['pembayaranOngkir']>) {
    editOrder((o) => ({
      ...o,
      pembayaranOngkir: o.pembayaranOngkir === value ? null : value,
    }));
  }

  function setOngkir(text: string) {
    const ongkir = Number(text.replace(/\D/g, '')) || 0;
    editOrder((o) => ({ ...o, ongkir }));
  }

  function setStatusPembayaran(status: PaymentStatus) {
    // A partly paid order only becomes Lunas after the jastiper confirms
    // the rest has really been paid.
    const partlyPaid = order.statusPembayaran === 'belumLunas' || (order.dp ?? 0) > 0;
    if (status === 'lunas' && order.statusPembayaran !== 'lunas' && partlyPaid) {
      setConfirmingLunas(true);
      return;
    }
    editOrder((o) => ({ ...o, statusPembayaran: status }));
  }

  // The status follows the DP unless the order is already Lunas: typing
  // one makes it "Belum lunas", clearing it puts it back to "Belum bayar".
  function setDp(text: string) {
    const dp = Number(text.replace(/\D/g, '').slice(0, 12)) || 0;
    editOrder((o) => ({
      ...o,
      dp: dp > 0 ? dp : undefined,
      statusPembayaran: o.statusPembayaran === 'lunas' ? 'lunas' : dp > 0 ? 'belumLunas' : 'belum',
    }));
  }

  // What the customer actually owes: goods cost (order.totalPembayaran)
  // plus the jastip fee (order.profit) — same correction applied to
  // Tambah Pesanan's own confirmation message, since "Total pembayaran"
  // alone is really just the goods cost (see lib/events-store.tsx).
  // Ongkir only joins the bill when it's paid upfront ("Bayar ongkir di
  // awal") — paid-on-delivery ongkir goes straight to the courier.
  const ongkirDitagih = order.pembayaranOngkir === 'awal' ? (order.ongkir ?? 0) : 0;
  const totalTagihan = order.totalPembayaran + order.profit + ongkirDitagih;

  return (
    <>
      <View className="flex-1 bg-white">
        <View className="flex-row items-center gap-[5px] px-[20px] pt-[20px]">
          {/* Always to this order's event page — not router.back(), which
              would return to wherever the user came from (e.g. the tagihan
              preview) and does nothing after a direct load. */}
          <Pressable
            onPress={() => (isDirty ? setConfirmingDiscard(true) : goToEvent())}
            hitSlop={8}>
            <CaretCircleLeftIcon width={24} height={24} />
          </Pressable>
          <Text className="flex-1 font-inter-bold text-[14px] text-[#5d5d5d]">Detil pesanan</Text>
          <MoreMenu
            label="Menu pesanan"
            items={[
              {
                label: 'Hapus pesanan',
                destructive: true,
                onPress: () => setConfirmingDelete(true),
              },
            ]}
          />
        </View>

        <ScrollView contentContainerClassName="gap-[16px] px-[20px] pb-[40px] pt-[20px]">
          <View className="gap-[0px]">
            <Text className="font-inter text-[10px] text-neutral-800">Nomor order</Text>
            <Text className="font-inter-bold text-[14px] text-black">{order.orderNumber}</Text>
          </View>

          <View className="gap-[4px]">
            <Text className="font-inter text-[10px] text-neutral-800">Nama</Text>
            <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Input
                value={order.nama}
                onChangeText={setNama}
                placeholderTextColor="#9ca3af"
                className="h-auto border-0 bg-transparent p-0 text-[12px] text-black shadow-none"
              />
            </View>
          </View>

          <View className="gap-[4px]">
            <Text className="font-inter text-[10px] text-neutral-800">Alamat</Text>
            <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Input
                value={order.alamat}
                onChangeText={setAlamat}
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
                className="h-auto border-0 bg-transparent p-0 text-[12px] text-black shadow-none"
              />
            </View>
          </View>

          <View className="gap-[4px]">
            <Text className="font-inter text-[10px] text-neutral-800">No. Whatsapp</Text>
            <View className="flex-row items-center gap-[10px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Text className="font-inter text-[12px] text-neutral-400">+62</Text>
              <Input
                value={whatsappLocal}
                onChangeText={setWhatsapp}
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
          </View>

          <View className="gap-[10px]">
            <Text className="font-inter-bold text-[14px] text-neutral-800">Metode pengiriman</Text>
            <View className="flex-row gap-[10px]">
              {(
                [
                  ['instant', 'Instant'],
                  ['ekspedisi', 'Via Expedisi'],
                ] as const
              ).map(([value, label]) => {
                const selected = order.metodePengiriman === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setMetodePengiriman(value)}
                    className={cn(
                      'items-center justify-center rounded-[4px] border px-[10px] py-[6px]',
                      selected ? 'border-orange-500 bg-orange-500' : 'border-[#5d5d5d] bg-white'
                    )}>
                    <Text
                      className={cn(
                        'font-inter text-[10px]',
                        selected ? 'text-white' : 'text-[#5d5d5d]'
                      )}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Figma section 181:627 — Default 181:550 / Bayar ongkir di
                awal 181:370 / Ongkir dibayar saat pengiriman 181:447. Only
                the Default frame has the label + helper-line rows (181:558);
                the same row layout is used for the ticked states too. */}
            <Text className="font-inter-semibold text-[12px] text-neutral-800">
              Pembayaran ongkos kirim
            </Text>
            {ONGKIR_OPTIONS.map(({ value, label, info }) => {
              const checked = order.pembayaranOngkir === value;
              return (
                <React.Fragment key={value}>
                  <Pressable
                    onPress={() => togglePembayaranOngkir(value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    className="flex-row items-center gap-[5px] self-start">
                    {checked ? (
                      <CheckSquareIcon width={12} height={12} />
                    ) : (
                      <View className="h-[10px] w-[10px] rounded-[2px] border border-[#5d5d5d]" />
                    )}
                    <View className="shrink justify-center gap-[2px]">
                      <Text className="font-inter text-[12px] text-neutral-800">{label}</Text>
                      <Text className="font-inter text-[12px] text-neutral-500">{info}</Text>
                    </View>
                  </Pressable>
                  {value === 'awal' && checked ? (
                    <View className="w-[96px] gap-[4px]">
                      <Text className="font-inter text-[12px] text-[#1e1e1e]">Ongkos kirim</Text>
                      <View className="flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                        <Text className="font-inter text-[12px] text-neutral-400">IDR</Text>
                        <Input
                          value={order.ongkir ? order.ongkir.toLocaleString('id-ID') : ''}
                          onChangeText={setOngkir}
                          placeholder="0"
                          placeholderTextColor="#9ca3af"
                          keyboardType="number-pad"
                          className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-[#5a5959] shadow-none"
                        />
                      </View>
                    </View>
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>

          <View className="gap-[13px]">
            <Text className="font-inter-bold text-[14px] text-neutral-800">List pesanan</Text>
            <View className="gap-[11px]">
              {order.items.map((item, index) => {
                // computeItemTotals gives the fee for the whole line; the row
                // is labelled "per item", so it shows the fee for one unit.
                const feePerItem =
                  item.jumlah > 0 ? Math.round(computeItemTotals(item).fee / item.jumlah) : 0;
                return (
                  <View
                    key={item.id}
                    className={cn(
                      'gap-[8px]',
                      index > 0 && 'border-t border-neutral-300 pt-[11px]'
                    )}>
                    <View className="flex-row items-end justify-between gap-[8px]">
                      <View className="flex-1 gap-[8px]">
                        <View className="flex-row items-center gap-[5px]">
                          {/* Always empty/unchecked — Figma shows this
                            same unfilled box in BOTH the not-yet-bought
                            node (105:4790) and the already-bought node
                            (105:5015, item 1 has a receipt photo and item
                            2 has the "Sudah dibeli" badge, yet both still
                            render an empty checkbox) — it's a static
                            visual marker in the design, not a live
                            dibeli indicator, so it's never filled here. */}
                          <View className="size-[10px] rounded-[2px] border border-[#5d5d5d]" />
                          <Text className="font-inter text-[12px] text-neutral-800">
                            {item.namaProduk}
                          </Text>
                        </View>
                        <Text className="font-inter text-[12px] text-neutral-800">
                          {item.jumlah} x {formatIDR(item.harga)} | Jastip fee (per item):{' '}
                          {formatIDR(feePerItem)}
                        </Text>
                        {/* The jastiper's own note; this page is never shared. */}
                        {item.hargaAsli ? (
                          <Text className="font-inter text-[10px] text-neutral-700">
                            Harga asli: {formatIDR(item.hargaAsli)} (catatan pribadi)
                          </Text>
                        ) : null}
                        {/* Figma node 105:5015: once an item is confirmed
                          WITH a receipt photo attached, its row shows the
                          photo thumbnail here instead of nothing. Tapping
                          it opens the full-size preview Modal below. */}
                        {item.dibeli && item.fotoStruk ? (
                          <Pressable onPress={() => setPreviewPhoto(item.fotoStruk)}>
                            <Image
                              source={{ uri: item.fotoStruk }}
                              resizeMode="cover"
                              className="size-[45px] rounded-[4px]"
                            />
                          </Pressable>
                        ) : null}
                      </View>
                      {item.dibeli && item.fotoStruk ? (
                        <View className="gap-[6px]">
                          {/* Once a photo is attached, the "Sudah dibeli"
                            pill (this branch's own normal entry point
                            back into the confirm/edit sheet) is replaced
                            by the thumbnail + Cetak penanda — without
                            this, there'd be no way left to reopen that
                            item's details. "Edit" restores that entry
                            point, reusing the exact same sheet/draft
                            (openConfirm), not a separate form. */}
                          <Pressable
                            onPress={() => openConfirm(item.id)}
                            className="items-center justify-center rounded-[4px] border border-orange-500 px-[10px] py-[4px]">
                            <Text className="font-inter text-[10px] text-orange-500">Edit</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleCetakPenanda(item.id)}
                            className="flex-row items-center justify-center gap-[4px] rounded-[4px] border border-[#5d5d5d] px-[10px] py-[4px]">
                            <PrinterIcon width={18} height={18} />
                            <Text className="font-inter text-[10px] text-black">Cetak penanda</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => openConfirm(item.id)}
                          className="items-center justify-center rounded-[4px] border border-[#5d5d5d] bg-white px-[10px] py-[6px]">
                          <Text className="font-inter text-[10px] text-black">Sudah dibeli</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <Pressable
              onPress={openAddItem}
              className="w-[82px] items-center rounded-[8px] border border-orange-400 bg-orange-50 p-[10px]">
              <Text className="font-inter text-[12px] text-orange-500">+Tambah</Text>
            </Pressable>
          </View>

          <View className="gap-[6px]">
            <Text className="font-inter-bold text-[10px] text-neutral-800">Total pembelanjaan</Text>
            <Text className="font-inter text-[12px] text-neutral-800">
              {formatIDR(order.totalPembayaran)}
            </Text>
          </View>

          <View className="gap-[6px]">
            <Text className="font-inter-bold text-[10px] text-neutral-800">Profit</Text>
            <Text className="font-inter text-[12px] text-neutral-800">
              {formatIDR(order.profit)}
            </Text>
          </View>

          <View className="gap-[6px]">
            <Text className="font-inter-bold text-[10px] text-neutral-800">
              Total tagihan ke pelanggan
            </Text>
            <Text className="font-inter text-[12px] text-neutral-800">
              {formatIDR(totalTagihan)}
            </Text>
          </View>

          {/* Optional down payment; what's left shows underneath. */}
          <View className="gap-[6px]">
            <Text className="font-inter-bold text-[10px] text-neutral-800">DP (opsional)</Text>
            <View className="min-h-[37px] flex-row items-center gap-[10px] rounded-[8px] border border-neutral-400 bg-white px-[10px]">
              <Text className="font-inter text-[12px] text-neutral-400">IDR</Text>
              <Input
                value={order.dp ? order.dp.toLocaleString('id-ID') : ''}
                onChangeText={setDp}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                accessibilityLabel="DP"
                className="h-auto min-h-[35px] min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
          </View>

          <View className="gap-[6px]">
            <Text className="font-inter-bold text-[10px] text-neutral-800">Sisa pembayaran</Text>
            <Text className="font-inter text-[12px] text-neutral-800">
              {formatIDR(getSisaPembayaran(order))}
            </Text>
          </View>

          <View className="gap-[10px]">
            <Text className="font-inter-bold text-[12px] text-neutral-800">Status pembayaran</Text>
            <View className="flex-row gap-[10px]">
              {(
                [
                  ['lunas', 'Lunas'],
                  ['belumLunas', 'Belum lunas'],
                  ['belum', 'Belum bayar'],
                ] as const
              ).map(([value, label]) => {
                const selected = order.statusPembayaran === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setStatusPembayaran(value)}
                    className={cn(
                      'items-center justify-center rounded-[4px] border px-[10px] py-[6px]',
                      selected ? 'border-orange-500 bg-orange-500' : 'border-[#5d5d5d] bg-white'
                    )}>
                    <Text
                      className={cn(
                        'font-inter text-[10px]',
                        selected ? 'text-white' : 'text-[#5d5d5d]'
                      )}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Simpan is the screen's main action: nothing above is saved
              until it is pressed. */}
          <View className="gap-[8px]">
            <Pressable
              onPress={handleSave}
              disabled={!isDirty}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isDirty }}
              className={cn(
                'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                isDirty ? 'bg-orange-500' : 'bg-orange-200'
              )}>
              <Text
                className={cn(
                  'font-inter-semibold text-[14px]',
                  isDirty ? 'text-white' : 'text-orange-300'
                )}>
                Simpan
              </Text>
            </Pressable>
            {justSaved && !isDirty ? (
              <Text className="text-center font-inter text-[12px] text-orange-500">
                ✓ Tersimpan
              </Text>
            ) : null}
          </View>

          <View className="h-px w-full bg-neutral-300" />

          {/* Opens the bill (app/tagihan.tsx) in the same tab/stack, so its
              back arrow returns here. The bill is built from the saved
              order, so it is unavailable while there are unsaved edits. */}
          {isDirty ? (
            <View className="gap-[8px]">
              <View
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                className="w-full items-center justify-center rounded-[12px] border border-orange-200 bg-white px-[10px] py-[16px]">
                <Text className="font-inter-semibold text-[14px] text-orange-300">
                  Cetak tagihan customer
                </Text>
              </View>
              <Text className="text-center font-inter text-[10px] text-neutral-500">
                Simpan perubahan dulu untuk mencetak tagihan.
              </Text>
            </View>
          ) : (
            <Link
              href={{
                pathname: '/tagihan',
                params: { eventId: event.id, orderId: order.id },
              }}
              asChild>
              <Pressable className="w-full items-center justify-center rounded-[12px] border border-orange-500 bg-white px-[10px] py-[16px]">
                <Text className="font-inter-semibold text-[14px] text-orange-500">
                  Cetak tagihan customer
                </Text>
              </Pressable>
            </Link>
          )}
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={confirmingDiscard}
        title="Buang perubahan?"
        message="Perubahan di pesanan ini belum disimpan. Kalau kamu keluar sekarang, perubahannya hilang."
        confirmLabel="Buang"
        cancelLabel="Lanjut edit"
        onConfirm={() => {
          setConfirmingDiscard(false);
          goToEvent();
        }}
        onCancel={() => setConfirmingDiscard(false)}
      />

      <ConfirmDialog
        visible={confirmingLunas}
        tone="primary"
        title="Ubah status jadi Lunas?"
        message={
          (order.dp ?? 0) > 0
            ? `Pelanggan ini baru membayar DP ${formatIDR(order.dp ?? 0)}, masih ada sisa ${formatIDR(getSisaPembayaran(order))}. Pastikan sisanya sudah dilunasi sebelum mengubah status menjadi Lunas.`
            : 'Pesanan ini baru dibayar sebagian. Pastikan pelanggan sudah melunasi sisanya sebelum mengubah status menjadi Lunas.'
        }
        confirmLabel="Ya, sudah lunas"
        onConfirm={() => {
          setConfirmingLunas(false);
          editOrder((o) => ({ ...o, statusPembayaran: 'lunas' }));
        }}
        onCancel={() => setConfirmingLunas(false)}
      />

      <ConfirmDialog
        visible={confirmingDelete}
        title="Hapus pesanan?"
        message={`Pesanan ${order.orderNumber} atas nama ${order.nama || 'customer'} akan dihapus dari semua perangkat toko ini dan tidak bisa dikembalikan.`}
        confirmLabel="Hapus"
        onConfirm={handleDeleteOrder}
        onCancel={() => setConfirmingDelete(false)}
      />

      {confirmDraft ? (
        <BottomSheet
          onClose={() => {
            setConfirmingItemId(null);
            setConfirmDraft(null);
          }}
          sheetClassName="bg-orange-100">
          {(close) => (
            <ScrollView
              contentContainerClassName="gap-[24px] px-[31px] pb-[32px] pt-[24.5px]"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Pressable onPress={close} hitSlop={8} className="flex-row items-center gap-[6px]">
                <CaretCircleLeftIcon width={24} height={24} />
                <Text className="font-inter-semibold text-[16px] text-black">
                  Konfirmasi barang sudah dibeli
                </Text>
              </Pressable>

              <View className="gap-[16px]">
                <View className="gap-[4px]">
                  <Text className="font-inter text-[12px] text-[#1e1e1e]">Nama produk</Text>
                  <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                    <Input
                      value={confirmDraft.namaProduk}
                      onChangeText={(v) => updateConfirmDraft({ namaProduk: v })}
                      placeholderTextColor="#9ca3af"
                      className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                    />
                  </View>
                </View>

                <View className="flex-row items-start gap-[8px]">
                  <View className="w-[47px] gap-[4px]">
                    <Text className="font-inter text-[12px] text-[#1e1e1e]">Jumlah</Text>
                    <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Input
                        value={confirmDraft.jumlah}
                        onChangeText={(v) => updateConfirmDraft({ jumlah: v })}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                  </View>
                  <View className="w-[92px] gap-[4px]">
                    <Text className="font-inter text-[12px] text-[#1e1e1e]">Harga</Text>
                    <View className="flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Text className="font-inter text-[12px] text-neutral-400">IDR</Text>
                      <Input
                        value={confirmDraft.harga}
                        onChangeText={(v) => updateConfirmDraft({ harga: v })}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                  </View>
                  {/* Same field, same interaction, as Tambah Pesanan's own
                    Fee Jastip: an anchored "Pakai %"/"Pakai IDR" dropdown
                    trigger (Pressable.measure() + a Modal rendered below,
                    not a decorative caret) next to an editable value
                    Input — not Figma's read-only two-box look from the
                    first pass at this sheet. */}
                  <View className="flex-1 gap-[4px]">
                    <Text className="font-inter text-[12px] text-[#1e1e1e]">Fee Jastip</Text>
                    <View className="flex-row gap-[4px]">
                      <Pressable
                        ref={feeTriggerRef}
                        onPress={openFeeDropdown}
                        className={cn(
                          'flex-row items-center gap-[4px] rounded-[8px] border bg-white p-[10px]',
                          feeDropdownAnchor ? 'border-orange-500' : 'border-neutral-400'
                        )}>
                        <Text className="font-inter text-[12px] text-neutral-800">
                          {confirmDraft.feeType === 'percent' ? 'Pakai %' : 'Pakai IDR'}
                        </Text>
                        <View
                          style={{
                            transform: [{ rotate: feeDropdownAnchor ? '180deg' : '0deg' }],
                          }}>
                          <CaretDownIcon width={15} height={15} />
                        </View>
                      </Pressable>
                      <View className="flex-1 flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                        <Input
                          value={confirmDraft.feeValue}
                          onChangeText={(v) => updateConfirmDraft({ feeValue: v })}
                          placeholder="0"
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                          className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                        />
                      </View>
                    </View>
                  </View>
                </View>

                <View className="gap-[4px]">
                  <Text className="font-inter-bold text-[12px] text-[#1e1e1e]">Foto struk</Text>
                  {fotoStrukDraft ? (
                    <View className="gap-[8px]">
                      <Pressable
                        onPress={handlePickFotoStruk}
                        className="h-[91px] w-full overflow-hidden rounded-[8px] border border-dashed border-neutral-400">
                        <Image
                          source={{ uri: fotoStrukDraft }}
                          resizeMode="cover"
                          className="h-full w-full"
                        />
                      </Pressable>
                      <Pressable
                        onPress={handlePickFotoStruk}
                        className="h-[34px] w-[190px] items-center justify-center rounded-[8px] border border-orange-500">
                        <Text className="font-inter-semibold text-[14px] text-orange-500">
                          Ganti foto struk
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handlePickFotoStruk}
                      className="w-[160px] flex-row items-center gap-[2px] rounded-[8px] border border-orange-400 bg-orange-50 p-[10px]">
                      <CameraIcon width={18} height={18} />
                      <Text className="font-inter text-[12px] text-orange-500">
                        Tambah foto struk
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <Pressable
                onPress={() => handleBuatPesanan(close)}
                disabled={!isConfirmValid}
                accessibilityRole="button"
                accessibilityState={{ disabled: !isConfirmValid }}
                className={cn(
                  'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                  isConfirmValid ? 'bg-orange-500' : 'bg-orange-200'
                )}>
                <Text
                  className={cn(
                    'font-inter-semibold text-[14px]',
                    isConfirmValid ? 'text-white' : 'text-orange-300'
                  )}>
                  Tandai sudah beli
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </BottomSheet>
      ) : null}

      {/* Anchored dropdown for Fee Jastip — identical mechanics to Tambah
        Pesanan's own: Modal supplies overlay stacking + tap-outside
        dismiss only, the panel itself is positioned via the trigger's
        measured coordinates so it renders directly below it. */}
      <Modal
        visible={feeDropdownAnchor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFeeDropdownAnchor(null)}>
        <Pressable className="flex-1" onPress={() => setFeeDropdownAnchor(null)}>
          {feeDropdownAnchor ? (
            <View
              className="absolute overflow-hidden rounded-[8px] border border-neutral-400 bg-white shadow-md"
              style={{
                top: feeDropdownAnchor.y + feeDropdownAnchor.height + 4,
                left: feeDropdownAnchor.x,
                width: Math.max(feeDropdownAnchor.width, 110),
              }}>
              {FEE_TYPE_OPTIONS.map(([value, label], index) => (
                <Pressable
                  key={value}
                  onPress={() => {
                    updateConfirmDraft({ feeType: value });
                    setFeeDropdownAnchor(null);
                  }}
                  className={cn('px-[12px] py-[10px]', index > 0 && 'border-t border-neutral-300')}>
                  <Text className="font-inter text-[12px] text-neutral-800">{label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>
      </Modal>

      {/* "Tambah list pesanan" — Figma node 174:429. Adds a brand new
        item to this order, distinct from the confirm sheet above (which
        edits an existing item). Same field layout/Fee Jastip mechanics,
        but two save actions instead of one: "Simpan" adds the item as
        not-yet-bought, "Tandai sudah dibeli" adds it already marked
        bought — letting the jastiper log an item they just purchased on
        the spot in one step instead of adding then separately
        confirming it. */}
      {addingItem ? (
        <BottomSheet onClose={() => setAddingItem(false)} sheetClassName="bg-orange-100">
          {(close) => (
            <ScrollView
              contentContainerClassName="gap-[24px] px-[31px] pb-[32px] pt-[24.5px]"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Pressable onPress={close} hitSlop={8} className="flex-row items-center gap-[6px]">
                <CaretCircleLeftIcon width={24} height={24} />
                <Text className="font-inter-semibold text-[16px] text-black">
                  Tambah list pesanan
                </Text>
              </Pressable>

              <View className="gap-[16px]">
                <View className="gap-[4px]">
                  <Text className="font-inter text-[12px] text-[#1e1e1e]">Nama produk</Text>
                  <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                    <Input
                      value={addItemDraft.namaProduk}
                      onChangeText={(v) => updateAddItemDraft({ namaProduk: v })}
                      placeholder="Nama produk"
                      placeholderTextColor="#9ca3af"
                      className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                    />
                  </View>
                </View>

                <View className="flex-row items-start gap-[8px]">
                  <View className="w-[47px] gap-[4px]">
                    <Text className="font-inter text-[12px] text-[#1e1e1e]">Jumlah</Text>
                    <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Input
                        value={addItemDraft.jumlah}
                        onChangeText={(v) => updateAddItemDraft({ jumlah: v })}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                  </View>
                  <View className="w-[92px] gap-[4px]">
                    <Text className="font-inter text-[12px] text-[#1e1e1e]">Harga</Text>
                    <View className="flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Text className="font-inter text-[12px] text-neutral-400">IDR</Text>
                      <Input
                        value={addItemDraft.harga}
                        onChangeText={(v) => updateAddItemDraft({ harga: v })}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                  </View>
                  <View className="flex-1 gap-[4px]">
                    <Text className="font-inter text-[12px] text-[#1e1e1e]">Fee Jastip</Text>
                    <View className="flex-row gap-[4px]">
                      <Pressable
                        ref={addFeeTriggerRef}
                        onPress={openAddFeeDropdown}
                        className={cn(
                          'flex-row items-center gap-[4px] rounded-[8px] border bg-white p-[10px]',
                          addFeeDropdownAnchor ? 'border-orange-500' : 'border-neutral-400'
                        )}>
                        <Text className="font-inter text-[12px] text-neutral-800">
                          {addItemDraft.feeType === 'percent' ? 'Pakai %' : 'Pakai IDR'}
                        </Text>
                        <View
                          style={{
                            transform: [{ rotate: addFeeDropdownAnchor ? '180deg' : '0deg' }],
                          }}>
                          <CaretDownIcon width={15} height={15} />
                        </View>
                      </Pressable>
                      <View className="flex-1 flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                        <Input
                          value={addItemDraft.feeValue}
                          onChangeText={(v) => updateAddItemDraft({ feeValue: v })}
                          placeholder="0"
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                          className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                        />
                      </View>
                    </View>
                  </View>
                </View>

                <View className="gap-[4px]">
                  <Text className="font-inter-bold text-[12px] text-[#1e1e1e]">Foto struk</Text>
                  {addFotoStrukDraft ? (
                    <View className="gap-[8px]">
                      <Pressable
                        onPress={handlePickAddFotoStruk}
                        className="h-[91px] w-full overflow-hidden rounded-[8px] border border-dashed border-neutral-400">
                        <Image
                          source={{ uri: addFotoStrukDraft }}
                          resizeMode="cover"
                          className="h-full w-full"
                        />
                      </Pressable>
                      <Pressable
                        onPress={handlePickAddFotoStruk}
                        className="h-[34px] w-[190px] items-center justify-center rounded-[8px] border border-orange-500">
                        <Text className="font-inter-semibold text-[14px] text-orange-500">
                          Ganti foto struk
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handlePickAddFotoStruk}
                      className="w-[160px] flex-row items-center gap-[2px] rounded-[8px] border border-orange-400 bg-orange-50 p-[10px]">
                      <CameraIcon width={18} height={18} />
                      <Text className="font-inter text-[12px] text-orange-500">
                        Tambah foto struk
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View className="flex-row gap-[10px]">
                <Pressable
                  onPress={() => handleAddItem(close, false)}
                  disabled={!isAddItemValid}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !isAddItemValid }}
                  className={cn(
                    'flex-1 items-center justify-center rounded-[12px] border px-[10px] py-[16px]',
                    isAddItemValid
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-orange-200 bg-orange-50'
                  )}>
                  <Text
                    className={cn(
                      'font-inter-semibold text-[14px]',
                      isAddItemValid ? 'text-orange-500' : 'text-orange-300'
                    )}>
                    Simpan
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleAddItem(close, true)}
                  disabled={!isAddItemValid}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !isAddItemValid }}
                  className={cn(
                    'flex-1 items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                    isAddItemValid ? 'bg-orange-500' : 'bg-orange-200'
                  )}>
                  <Text
                    className={cn(
                      'font-inter-semibold text-[14px]',
                      isAddItemValid ? 'text-white' : 'text-orange-300'
                    )}>
                    Tandai sudah dibeli
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </BottomSheet>
      ) : null}

      <Modal
        visible={addFeeDropdownAnchor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAddFeeDropdownAnchor(null)}>
        <Pressable className="flex-1" onPress={() => setAddFeeDropdownAnchor(null)}>
          {addFeeDropdownAnchor ? (
            <View
              className="absolute overflow-hidden rounded-[8px] border border-neutral-400 bg-white shadow-md"
              style={{
                top: addFeeDropdownAnchor.y + addFeeDropdownAnchor.height + 4,
                left: addFeeDropdownAnchor.x,
                width: Math.max(addFeeDropdownAnchor.width, 110),
              }}>
              {FEE_TYPE_OPTIONS.map(([value, label], index) => (
                <Pressable
                  key={value}
                  onPress={() => {
                    updateAddItemDraft({ feeType: value });
                    setAddFeeDropdownAnchor(null);
                  }}
                  className={cn('px-[12px] py-[10px]', index > 0 && 'border-t border-neutral-300')}>
                  <Text className="font-inter text-[12px] text-neutral-800">{label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>
      </Modal>

      {/* Full-size photo preview — tapping a "Sudah dibeli" item's
        receipt thumbnail opens it here, centered over a dark backdrop,
        with a download action. Not a BottomSheet (this is a plain
        centered viewer, not a form), so a transparent Modal here is the
        right tool, same as the Fee Jastip dropdowns above. */}
      <Modal
        visible={previewPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhoto(null)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/80 px-[24px]"
          onPress={() => setPreviewPhoto(null)}>
          {/* Nested Pressable with no onPress-bubbling to the backdrop —
              React Native's responder system consumes the touch here,
              same pattern as Buka Event Jastip's own calendar Modal. */}
          <Pressable className="w-full max-w-[330px] gap-[16px]">
            {previewPhoto ? (
              <Image
                source={{ uri: previewPhoto }}
                resizeMode="contain"
                className="aspect-square w-full rounded-[8px] bg-black"
              />
            ) : null}
            <View className="flex-row items-center justify-center gap-[16px]">
              <Pressable
                onPress={handleDownloadPhoto}
                className="flex-1 items-center justify-center rounded-[12px] bg-orange-500 px-[10px] py-[14px]">
                <Text className="font-inter-semibold text-[14px] text-white">Download</Text>
              </Pressable>
              <Pressable onPress={() => setPreviewPhoto(null)} hitSlop={8}>
                <XCircleIcon width={32} height={32} />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
