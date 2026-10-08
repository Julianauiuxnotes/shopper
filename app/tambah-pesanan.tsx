import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import CaretDownIcon from '@/assets/images/figma/icon-caret-down.svg';
import TrashIcon from '@/assets/images/figma/icon-trash.svg';
import XCircleOrangeIcon from '@/assets/images/figma/icon-x-circle-orange.svg';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useEvents } from '@/lib/events-store';
import { eventCurrency, formatForeign } from '@/lib/currency';
import { formatIDR } from '@/lib/format';
import { useSettings } from '@/lib/settings-store';
import { parseOrderForm } from '@/lib/parse-order-form';
import { cn } from '@/lib/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';

// The example order form from Figma's "Contoh rekomendasi order form"
// pop-up (node 199:794), as [label, value] rows so the pop-up can bold
// the labels. "Salin contoh form order" copies it as plain text for the
// jastiper to send to customers; lib/parse-order-form.ts reads this
// format, including the "[Nama produk (Jumlah)] contoh →" hint.
const CONTOH_GREETING = 'Hi dear, yuk lengkapi form pesanan dibawah ini ya';
const CONTOH_ROWS = [
  ['Nama', 'Anjani'],
  ['Alamat', 'Perumahan Galaxy, blok Jupiter no. 2, Bandung, 40524'],
  ['No. Whatsapp', '0851211151167'],
  [
    'List pesanan',
    '[Nama produk (Jumlah)] contoh → Herborist lotion Strawberry (1), Wardah cushion shade N21 (1)',
  ],
] as const;
const CONTOH_FORM_PESANAN = [
  CONTOH_GREETING,
  '',
  ...CONTOH_ROWS.map(([label, value]) => `${label}: ${value}`),
].join('\n');

const FEE_TYPE_OPTIONS = [
  ['percent', 'Pakai %'],
  ['flat', 'Pakai IDR'],
] as const;

type ItemDraft = {
  key: string;
  namaProduk: string;
  jumlah: string;
  harga: string;
  // The price at the event before the jastiper's markup. Optional.
  hargaAsli: string;
  feeType: 'percent' | 'flat';
  feeValue: string;
};

function blankItem(): ItemDraft {
  return {
    key: Math.random().toString(36).slice(2),
    namaProduk: '',
    jumlah: '',
    harga: '',
    hargaAsli: '',
    feeType: 'percent',
    feeValue: '',
  };
}

function parseNumber(s: string) {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Mirrors lib/events-store.tsx's computeItemTotals — kept in sync by
// hand since this is only a live preview; the store recomputes
// authoritatively when the order is actually created.
// `kurs` turns the typed price into IDR: 1 for a Lokal event, the event's
// rate for an Internasional one (lib/currency.ts).
function itemTotals(item: ItemDraft, kurs: number) {
  const jumlah = parseNumber(item.jumlah);
  const harga = Math.round(parseNumber(item.harga) * kurs);
  const feeValue = parseNumber(item.feeValue);
  const subtotal = harga * jumlah;
  const fee = item.feeType === 'percent' ? subtotal * (feeValue / 100) : feeValue * jumlah;
  return { subtotal, fee };
}

// Figma section TAMBAH PESANAN MANUAL, node 53:3251 (empty) / 53:3323 /
// 53:3395 (filled, 1 and 2 items). The "Order form" paste box reads the
// pasted text into the fields below (lib/parse-order-form.ts).
// "Nomor order" shows the real order number this will get (not
// the mockup's literal "Auto" placeholder) since it's fully
// deterministic from the event's existing order count.
export default function TambahPesananScreen() {
  const router = useRouter();
  const { getEvent, addOrder } = useEvents();
  const { userProfile } = useSettings();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const event = eventId ? getEvent(eventId) : undefined;
  // Prices are typed in the event's currency and stored in IDR.
  const currency = eventCurrency(event);

  const [orderFormText, setOrderFormText] = React.useState('');
  const [nama, setNama] = React.useState('');
  const [alamat, setAlamat] = React.useState('');
  const [whatsapp, setWhatsapp] = React.useState('');
  const [metodePengiriman, setMetodePengiriman] = React.useState<'instant' | 'ekspedisi'>(
    'instant'
  );
  const [items, setItems] = React.useState<ItemDraft[]>([blankItem()]);
  // Down payment already received, digits only. Optional.
  const [dp, setDp] = React.useState('');
  // What the last "Terapkan" managed to fill, for the note under the
  // box; null until it has been applied (and again once the text changes).
  const [autoFilled, setAutoFilled] = React.useState<string[] | null>(null);

  // "Contoh form pesanan": a pop-up (Figma node 199:794) with the
  // recommended order-form format, which the jastiper can copy and send
  // to customers to fill in.
  const [showContoh, setShowContoh] = React.useState(false);
  // Fade driven by hand rather than Modal's own animationType, so it's the
  // same eased fade in and out on web and native — and so the pop-up stays
  // mounted while it fades out (closeContoh only hides it afterwards).
  // The same 0→1 value also eases the card up 12px and from 96% size, so
  // it settles into place instead of just blinking on.
  const contohOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!showContoh) return;
    Animated.timing(contohOpacity, {
      toValue: 1,
      duration: 360,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [showContoh, contohOpacity]);

  function closeContoh() {
    Animated.timing(contohOpacity, {
      toValue: 0,
      duration: 280,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start(() => setShowContoh(false));
  }
  const [contohCopied, setContohCopied] = React.useState(false);

  async function handleSalinContoh() {
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(CONTOH_FORM_PESANAN);
        setContohCopied(true);
      } catch {
        // clipboard blocked — the text is still on screen to select by hand.
      }
      return;
    }
    // No clipboard module in this app; the share sheet offers "Copy" and
    // can send the template straight to a chat.
    try {
      await Share.share({ message: CONTOH_FORM_PESANAN });
    } catch {
      // dismissed
    }
  }

  function handleChangeOrderForm(text: string) {
    setOrderFormText(text);
    setAutoFilled(null);
  }

  const canApplyOrderForm = orderFormText.trim().length > 0;

  // "Terapkan": reads the pasted order-form text
  // (lib/parse-order-form.ts) and fills every field it recognises;
  // unrecognised fields keep what they had. Recognised products replace
  // the whole list — Harga and Fee Jastip are the jastiper's own numbers
  // and are still filled in by hand. Only on the button, not while
  // typing, so pasting or editing the text never changes the form by
  // itself.
  function handleApplyOrderForm() {
    if (!canApplyOrderForm) return;
    const parsed = parseOrderForm(orderFormText);
    const filled: string[] = [];
    if (parsed.nama) {
      setNama(parsed.nama);
      filled.push('Nama');
    }
    if (parsed.alamat) {
      setAlamat(parsed.alamat);
      filled.push('Alamat');
    }
    if (parsed.whatsapp) {
      setWhatsapp(parsed.whatsapp);
      filled.push('No. Whatsapp');
    }
    if (parsed.metodePengiriman) {
      setMetodePengiriman(parsed.metodePengiriman);
      filled.push('Metode pengiriman');
    }
    if (parsed.items.length > 0) {
      setItems(
        parsed.items.map((it) => ({
          ...blankItem(),
          namaProduk: it.namaProduk,
          jumlah: String(it.jumlah),
        }))
      );
      filled.push(`${parsed.items.length} produk`);
    }
    setAutoFilled(filled);
  }
  // Anchored dropdown (not a centered modal): measures the tapped
  // trigger's on-screen position so the options panel renders directly
  // below it, like a real <select>. `feeTriggerRefs` holds one ref per
  // repeatable item (only one item's trigger is ever measured at a time).
  const feeTriggerRefs = React.useRef<Record<string, React.ElementRef<typeof Pressable> | null>>(
    {}
  );
  const [dropdownAnchor, setDropdownAnchor] = React.useState<{
    key: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  function openFeeDropdown(key: string) {
    feeTriggerRefs.current[key]?.measure((_fx, _fy, width, height, pageX, pageY) => {
      setDropdownAnchor({ key, x: pageX, y: pageY, width, height });
    });
  }

  function updateItem(key: string, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
    delete feeTriggerRefs.current[key];
  }

  const validItems = items.filter(
    (it) => it.namaProduk.trim() && parseNumber(it.jumlah) > 0 && parseNumber(it.harga) > 0
  );
  const isValid =
    nama.trim().length > 0 &&
    alamat.trim().length > 0 &&
    whatsapp.trim().length > 0 &&
    validItems.length > 0;

  const totals = items.reduce(
    (acc, it) => {
      const { subtotal, fee } = itemTotals(it, currency.kurs);
      return { totalPembelanjaan: acc.totalPembelanjaan + subtotal, profit: acc.profit + fee };
    },
    { totalPembelanjaan: 0, profit: 0 }
  );
  // What the customer actually owes: the goods cost plus the jastip fee
  // — distinct from totalPembelanjaan (goods cost alone) so the
  // confirmation message doesn't under-quote the customer.
  const totalTagihan = totals.totalPembelanjaan + totals.profit;

  const nextOrderNumber = `ORD-${String((event?.orders.length ?? 0) + 1).padStart(4, '0')}`;

  async function handleSubmit() {
    if (!event || !isValid) return;
    addOrder(event.id, {
      nama,
      alamat,
      whatsapp: `+62${whatsapp}`,
      metodePengiriman,
      dp: Number(dp) || 0,
      items: validItems.map((it) => ({
        namaProduk: it.namaProduk,
        jumlah: parseNumber(it.jumlah),
        harga: Math.round(parseNumber(it.harga) * currency.kurs),
        ...(currency.foreign ? { hargaAsing: parseNumber(it.harga) } : {}),
        ...(parseNumber(it.hargaAsli) > 0
          ? {
              hargaAsli: Math.round(parseNumber(it.hargaAsli) * currency.kurs),
              ...(currency.foreign ? { hargaAsliAsing: parseNumber(it.hargaAsli) } : {}),
            }
          : {}),
        feeType: it.feeType,
        feeValue: parseNumber(it.feeValue),
      })),
    });

    // Opens WhatsApp with the confirmation message pre-filled — the
    // jastiper still taps send themselves inside WhatsApp, this doesn't
    // send silently on their behalf. wa.me needs digits only (country
    // code, no "+"); `whatsapp` here is just the local number the user
    // typed (the "+62" prefix is fixed UI, not part of this value).
    // Quotes totalTagihan (goods + jastip fee), not totalPembelanjaan
    // (goods alone) — the customer owes the full billed amount, not just
    // the cost of the items themselves. Lists each item as "nama,
    // jumlah" (matching the exact format the user specified), joined by
    // ", " — same message format as Order Detail's "Kirim total
    // pembayaran" button.
    const namaJastip = userProfile.namaJastip || 'Jastip by Juli';
    const itemsList = validItems.map((it) => `${it.namaProduk}, ${it.jumlah}`).join(', ');
    const message =
      `Hi! ini pesan konfirmasi dari ${namaJastip}. Kami sudah catat pesananmu ya. ` +
      `Pesananmu ada ${validItems.length} items dengan total pembayaran IDR ` +
      `${totalTagihan.toLocaleString('id-ID')}. ` +
      `Item pesananmu : ${itemsList}.` +
      (Number(dp) > 0
        ? ` DP yang sudah dibayar IDR ${Number(dp).toLocaleString('id-ID')}, ` +
          `sisa pembayaran IDR ${Math.max(0, totalTagihan - Number(dp)).toLocaleString('id-ID')}.`
        : '');
    const phoneDigits = `62${whatsapp.replace(/\D/g, '')}`;
    const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(waUrl);
    } catch {
      // no WhatsApp / can't open the link — order is already saved, so
      // just continue to Event Detail rather than blocking on this.
    }

    // Lands on the chip the new order is listed under.
    router.replace({
      pathname: '/event-detail',
      params: { id: event.id, tab: 'pesanan', status: Number(dp) > 0 ? 'belumLunas' : 'belum' },
    });
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
    <>
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="gap-[16px] px-[20px] pb-[40px] pt-[20px]"
          keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="flex-row items-center gap-[5px]">
            <CaretCircleLeftIcon width={24} height={24} />
            <Text className="font-inter-bold text-[16px] text-[#5d5d5d]">Tambah pesanan</Text>
          </Pressable>

          <View className="gap-[1px]">
            <Text className="font-inter text-[12px] text-neutral-800">Nomor order</Text>
            <Text className="font-inter-bold text-[14px] italic text-neutral-800">
              {nextOrderNumber}
            </Text>
          </View>

          {/* Figma node 53:3315. */}
          <View className="gap-[10px]">
            <View className="gap-[4px]">
              <Text className="font-inter-bold text-[14px] text-neutral-800">
                Copy-paste form pesanan
              </Text>
              <Text className="font-inter text-[11px] text-neutral-600">
                Copy paste chat pesanan dari whatsapp disini dan terapkan untuk secara otomatis
                mengisi form pesanan.
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setContohCopied(false);
                setShowContoh(true);
              }}
              accessibilityRole="button"
              className="w-[166px] items-center justify-center rounded-[8px] border border-neutral-800 bg-neutral-50 p-[10px]">
              <Text className="font-inter text-[12px] text-neutral-800">Contoh form pesanan</Text>
            </Pressable>
            <Text className="font-inter text-[12px] text-neutral-800">Order form</Text>
            {/* The height lives on this wrapper, not the Input: the shared
                Input's own `sm:h-9` wins over a height class on screens
                640px and wider, which squashed this box to one line (36px)
                in a desktop browser while phones showed the full 114px. */}
            <View className="h-[114px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Input
                value={orderFormText}
                onChangeText={handleChangeOrderForm}
                placeholder="Copy Paste text order form disini."
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
                style={{ height: '100%' }}
                className="flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
            <Pressable
              onPress={handleApplyOrderForm}
              disabled={!canApplyOrderForm}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canApplyOrderForm }}
              className={cn(
                'items-center rounded-[8px] border p-[10px]',
                canApplyOrderForm ? 'border-orange-400 bg-orange-50' : 'border-orange-200 bg-white'
              )}>
              <Text
                className={cn(
                  'font-inter text-[12px]',
                  canApplyOrderForm ? 'text-orange-500' : 'text-orange-300'
                )}>
                Terapkan
              </Text>
            </Pressable>
            {autoFilled ? (
              <Text className="font-inter text-[10px] text-neutral-500">
                {autoFilled.length > 0
                  ? `Terisi otomatis: ${autoFilled.join(', ')}. Cek lagi, lalu isi Harga dan Fee Jastip.`
                  : 'Belum ada data yang dikenali. Lihat "Contoh form pesanan" untuk format yang bisa dibaca.'}
              </Text>
            ) : null}
          </View>

          <View className="h-px w-full bg-neutral-300" />

          <View className="gap-[6px]">
            <Text className="font-inter text-[12px] text-neutral-800">
              Atau isi manual form dibawah ini:
            </Text>
            <Text className="font-inter-bold text-[14px] text-neutral-800">
              Form pesanan manual
            </Text>
          </View>

          <View className="gap-[4px]">
            <Text className="font-inter text-[12px] text-neutral-800">Nama</Text>
            <Input
              value={nama}
              onChangeText={setNama}
              placeholder="Nama"
              placeholderTextColor="#9ca3af"
              className="h-auto rounded-[8px] border-neutral-400 bg-white p-[10px] text-[12px] text-neutral-800 shadow-none"
            />
          </View>

          <View className="gap-[4px]">
            <Text className="font-inter text-[12px] text-neutral-800">Alamat</Text>
            <Input
              value={alamat}
              onChangeText={setAlamat}
              placeholder="Alamat"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              className="h-[75px] rounded-[8px] border-neutral-400 bg-white p-[10px] text-[12px] text-neutral-800 shadow-none"
            />
          </View>

          <View className="gap-[4px]">
            <Text className="font-inter text-[12px] text-neutral-800">No. Whatsapp</Text>
            <View className="flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Text className="font-inter text-[12px] text-neutral-800">+62</Text>
              <Input
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="81234567890"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
          </View>

          <View className="gap-[10px]">
            <Text className="font-inter text-[12px] text-neutral-800">Metode pengiriman</Text>
            <View className="flex-row gap-[10px]">
              {(
                [
                  ['instant', 'Instant'],
                  ['ekspedisi', 'Via Expedisi'],
                ] as const
              ).map(([value, label]) => {
                const selected = metodePengiriman === value;
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
          </View>

          <View className="gap-[16px]">
            <Text className="font-inter-bold text-[14px] text-neutral-800">List pesanan</Text>

            {totals.totalPembelanjaan > 0 ? (
              <>
                <View className="flex-row justify-between">
                  <View className="gap-[2px]">
                    <Text className="font-inter text-[12px] text-neutral-800">
                      Total pembelanjaan
                    </Text>
                    <Text className="font-inter-bold text-[14px] text-neutral-800">
                      {formatIDR(totals.totalPembelanjaan)}
                    </Text>
                  </View>
                  <View className="gap-[2px]">
                    <Text className="font-inter text-[12px] text-neutral-800">Profit</Text>
                    <Text className="font-inter-bold text-[14px] text-neutral-800">
                      {formatIDR(totals.profit)}
                    </Text>
                  </View>
                </View>
                <View className="gap-[2px]">
                  <Text className="font-inter text-[12px] text-neutral-800">
                    Total tagihan ke pelanggan
                  </Text>
                  <Text className="font-inter-bold text-[14px] text-neutral-800">
                    {formatIDR(totalTagihan)}
                  </Text>
                </View>
                <View className="h-px bg-neutral-300" />
              </>
            ) : null}

            {items.map((item, index) => (
              <View
                key={item.key}
                className={cn('gap-[16px]', index > 0 && 'border-t border-neutral-300 pt-[16px]')}>
                {/* Figma node 231:1111: name and quantity, then the two
                    prices side by side, then the jastip fee. */}
                <View className="flex-row items-start gap-[4px]">
                  <View className="flex-1 gap-[4px]">
                    <Text className="font-inter text-[12px] text-neutral-800">Nama produk</Text>
                    <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Input
                        value={item.namaProduk}
                        onChangeText={(v) => updateItem(item.key, { namaProduk: v })}
                        placeholder="Nama produk"
                        placeholderTextColor="#9ca3af"
                        className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                  </View>
                  <View className="w-[56px] gap-[4px]">
                    <Text className="font-inter text-[12px] text-neutral-800">Jumlah</Text>
                    <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Input
                        value={item.jumlah}
                        onChangeText={(v) => updateItem(item.key, { jumlah: v })}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        accessibilityLabel="Jumlah"
                        className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                  </View>
                </View>

                <View className="gap-[8px]">
                  <View className="flex-row items-start gap-[8px]">
                    {/* The price at the event, for the jastiper's own
                        records only: it takes no part in any total and is
                        never shown to the customer. */}
                    <View className="flex-1 gap-[4px]">
                      <Text className="font-inter text-[12px] text-neutral-800">Harga asli</Text>
                      <View className="flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                        <Text className="font-inter text-[12px] text-neutral-400">
                          {currency.code}
                        </Text>
                        <Input
                          value={item.hargaAsli}
                          onChangeText={(v) => updateItem(item.key, { hargaAsli: v })}
                          placeholder="0"
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                          accessibilityLabel="Harga asli"
                          className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                        />
                      </View>
                    </View>
                    <View className="flex-1 gap-[4px]">
                      <Text className="font-inter text-[12px] text-neutral-800">
                        Harga ke pelanggan
                      </Text>
                      <View className="flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                        <Text className="font-inter text-[12px] text-neutral-400">
                          {currency.code}
                        </Text>
                        <Input
                          value={item.harga}
                          onChangeText={(v) => updateItem(item.key, { harga: v })}
                          placeholder="0"
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                          accessibilityLabel="Harga ke pelanggan"
                          className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                        />
                      </View>
                    </View>
                  </View>
                  <Text className="font-inter text-[10px] text-neutral-700">
                    Harga asli hanya catatan untukmu: tidak ikut dihitung dan tidak tampil di
                    tagihan pelanggan. Boleh dikosongkan.
                  </Text>

                  <View className="gap-[4px]">
                    <Text className="font-inter text-[12px] text-neutral-800">Fee Jastip</Text>
                    <View className="flex-row gap-[4px]">
                      <Pressable
                        ref={(el) => {
                          feeTriggerRefs.current[item.key] = el;
                        }}
                        onPress={() => openFeeDropdown(item.key)}
                        className={cn(
                          'flex-1 flex-row items-center justify-between gap-[4px] rounded-[8px] border bg-white p-[10px]',
                          dropdownAnchor?.key === item.key
                            ? 'border-orange-500'
                            : 'border-neutral-400'
                        )}>
                        <Text className="font-inter text-[12px] text-neutral-800">
                          {item.feeType === 'percent' ? 'Pakai %' : 'Pakai IDR'}
                        </Text>
                        <View
                          style={{
                            transform: [
                              { rotate: dropdownAnchor?.key === item.key ? '180deg' : '0deg' },
                            ],
                          }}>
                          <CaretDownIcon width={15} height={15} />
                        </View>
                      </Pressable>
                      <View className="flex-1 flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                        {item.feeType === 'flat' ? (
                          <Text className="font-inter text-[12px] text-neutral-800">IDR</Text>
                        ) : null}
                        <Input
                          value={item.feeValue}
                          onChangeText={(v) => updateItem(item.key, { feeValue: v })}
                          placeholder="0"
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                          className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                        />
                        {item.feeType === 'percent' ? (
                          <Text className="font-inter text-[12px] text-neutral-800">%</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Internasional event: what the typed price comes to in
                    Rupiah, which is what gets saved and billed. */}
                {currency.foreign && parseNumber(item.harga) > 0 ? (
                  <Text className="font-inter text-[10px] text-neutral-700">
                    {formatForeign(parseNumber(item.harga), currency.code)} ≈{' '}
                    {formatIDR(Math.round(parseNumber(item.harga) * currency.kurs))} per barang
                    (kurs 1 {currency.code} = {formatIDR(currency.kurs)})
                  </Text>
                ) : null}

                {/* Not on the only row: the form always keeps one item to
                    fill in. */}
                {items.length > 1 ? (
                  <Pressable
                    onPress={() => removeItem(item.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Hapus produk ${item.namaProduk || index + 1}`}
                    className="flex-row items-center gap-[4px] self-start rounded-[8px] border border-neutral-800 bg-neutral-50 p-[10px]">
                    <TrashIcon width={16} height={16} />
                    <Text className="font-inter text-[12px] text-neutral-800">Hapus</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            <Pressable
              onPress={() => setItems((prev) => [...prev, blankItem()])}
              className="items-center rounded-[8px] border border-orange-400 bg-orange-50 px-[10px] py-[10px]">
              <Text className="font-inter text-[12px] text-orange-500">+Tambah</Text>
            </Pressable>
          </View>

          {/* Optional: leave empty when the customer hasn't paid anything.
              An order saved with a DP starts as "Belum lunas". */}
          <View className="gap-[4px]">
            <Text className="font-inter text-[12px] text-neutral-800">DP (opsional)</Text>
            <View className="min-h-[37px] flex-row items-center gap-[10px] rounded-[8px] border border-neutral-400 bg-white px-[10px]">
              <Text className="font-inter text-[12px] text-neutral-400">IDR</Text>
              <Input
                value={dp ? Number(dp).toLocaleString('id-ID') : ''}
                onChangeText={(value) => setDp(value.replace(/\D/g, '').slice(0, 12))}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                accessibilityLabel="DP"
                className="h-auto min-h-[35px] min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
            <Text className="font-inter text-[10px] text-neutral-700">
              {Number(dp) > 0
                ? `Sisa pembayaran ${formatIDR(Math.max(0, totalTagihan - Number(dp)))}. Pesanan akan berstatus Belum lunas.`
                : 'Isi jika pelanggan sudah membayar uang muka. Boleh dikosongkan.'}
            </Text>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!isValid}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isValid }}
            className={cn(
              'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
              isValid ? 'bg-orange-500' : 'bg-orange-200'
            )}>
            <Text
              className={cn(
                'font-inter-semibold text-[14px]',
                isValid ? 'text-orange-50' : 'text-orange-300'
              )}>
              Konfirmasi dan kirim total pembayaran
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Anchored dropdown, not a centered popup: Modal only supplies the
          overlay mechanics (stacking above everything + tap-outside
          dismiss); the panel itself is positioned via the trigger's
          measured on-screen coordinates so it renders directly below it,
          like a real <select>. */}
      <Modal
        visible={dropdownAnchor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownAnchor(null)}>
        <Pressable className="flex-1" onPress={() => setDropdownAnchor(null)}>
          {dropdownAnchor ? (
            <View
              className="absolute overflow-hidden rounded-[8px] border border-neutral-400 bg-white shadow-md"
              style={{
                top: dropdownAnchor.y + dropdownAnchor.height + 4,
                left: dropdownAnchor.x,
                width: Math.max(dropdownAnchor.width, 110),
              }}>
              {FEE_TYPE_OPTIONS.map(([value, label], index) => (
                <Pressable
                  key={value}
                  onPress={() => {
                    updateItem(dropdownAnchor.key, { feeType: value });
                    setDropdownAnchor(null);
                  }}
                  className={cn('px-[12px] py-[10px]', index > 0 && 'border-t border-neutral-300')}>
                  <Text className="font-inter text-[12px] text-neutral-800">{label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>
      </Modal>

      <Modal visible={showContoh} transparent animationType="none" onRequestClose={closeContoh}>
        {/* Inline style only: NativeWind classes don't apply to Animated.View. */}
        <Animated.View style={{ flex: 1, opacity: contohOpacity }}>
          <Pressable
            onPress={closeContoh}
            className="flex-1 items-center justify-center bg-black/50 p-[20px]">
            {/* Inner Pressable with no onPress: swallows taps on the card so
              only the backdrop dismisses. */}
            <Animated.View
              style={{
                width: '100%',
                maxWidth: 330,
                transform: [
                  {
                    translateY: contohOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                  {
                    scale: contohOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              }}>
              <Pressable className="w-full items-center gap-[10px] rounded-[8px] bg-white p-[20px]">
                <Pressable
                  onPress={closeContoh}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup"
                  hitSlop={8}
                  className="self-end p-[2px]">
                  <XCircleOrangeIcon width={19.5} height={19.5} />
                </Pressable>
                <View className="w-full gap-[4px]">
                  <Text className="font-inter-bold text-[14px] text-[#1e1e1e]">
                    Contoh rekomendasi order form
                  </Text>
                  <Text className="font-inter text-[12px] text-neutral-600">
                    Kamu bisa modifikasi form pesanan dibawah ini tapi pastikan form pesanan
                    memiliki komponen data Nama, Alamat, No.Whatsapp, dan List pesanan seperti
                    dibawah ini agar data bisa tersalin secara otomatis dan tepat ke form di
                    aplikasi Shopper.
                  </Text>
                </View>
                <View className="w-full">
                  <Text className="font-inter text-[14px] text-[#5d5d5d]">
                    <Text className="font-inter-bold text-[14px] text-[#5d5d5d]">Contoh</Text>:
                  </Text>
                  <Text selectable className="mt-[14px] font-inter text-[12px] text-[#5d5d5d]">
                    {CONTOH_GREETING}
                  </Text>
                  <View className="mt-[12px]">
                    {CONTOH_ROWS.map(([label, value]) => (
                      <Text
                        key={label}
                        selectable
                        className="font-inter text-[12px] text-[#5d5d5d]">
                        <Text className="font-inter-bold text-[12px] text-[#5d5d5d]">{label}</Text>:{' '}
                        {value}
                      </Text>
                    ))}
                  </View>
                </View>
                <Pressable
                  onPress={handleSalinContoh}
                  accessibilityRole="button"
                  className="mt-[14px] w-[187px] items-center justify-center rounded-[8px] border border-orange-400 bg-orange-50 p-[10px]">
                  <Text className="text-center font-inter text-[12px] text-orange-500">
                    {contohCopied ? '✓ Contoh tersalin' : 'Salin contoh form order'}
                  </Text>
                </Pressable>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
    </>
  );
}
