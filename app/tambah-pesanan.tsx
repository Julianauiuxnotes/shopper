import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import CaretDownIcon from '@/assets/images/figma/icon-caret-down.svg';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useEvents } from '@/lib/events-store';
import { formatIDR } from '@/lib/format';
import { useSettings } from '@/lib/settings-store';
import { cn } from '@/lib/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

const FEE_TYPE_OPTIONS = [
  ['percent', 'Pakai %'],
  ['flat', 'Pakai IDR'],
] as const;

type ItemDraft = {
  key: string;
  namaProduk: string;
  jumlah: string;
  harga: string;
  feeType: 'percent' | 'flat';
  feeValue: string;
};

function blankItem(): ItemDraft {
  return {
    key: Math.random().toString(36).slice(2),
    namaProduk: '',
    jumlah: '',
    harga: '',
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
function itemTotals(item: ItemDraft) {
  const jumlah = parseNumber(item.jumlah);
  const harga = parseNumber(item.harga);
  const feeValue = parseNumber(item.feeValue);
  const subtotal = harga * jumlah;
  const fee = item.feeType === 'percent' ? subtotal * (feeValue / 100) : feeValue * jumlah;
  return { subtotal, fee };
}

// Figma section TAMBAH PESANAN MANUAL, node 53:3251 (empty) / 53:3323 /
// 53:3395 (filled, 1 and 2 items). The "Order form" paste box captures
// raw text only — TODO: parse pasted order text into the fields below
// automatically; that's a distinct feature (text extraction) not built
// here. "Nomor order" shows the real order number this will get (not
// the mockup's literal "Auto" placeholder) since it's fully
// deterministic from the event's existing order count.
export default function TambahPesananScreen() {
  const router = useRouter();
  const { getEvent, addOrder } = useEvents();
  const { userProfile } = useSettings();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const event = eventId ? getEvent(eventId) : undefined;

  const [orderFormText, setOrderFormText] = React.useState('');
  const [nama, setNama] = React.useState('');
  const [alamat, setAlamat] = React.useState('');
  const [whatsapp, setWhatsapp] = React.useState('');
  const [metodePengiriman, setMetodePengiriman] = React.useState<'instant' | 'ekspedisi'>(
    'instant'
  );
  const [items, setItems] = React.useState<ItemDraft[]>([blankItem()]);
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
      const { subtotal, fee } = itemTotals(it);
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
      items: validItems.map((it) => ({
        namaProduk: it.namaProduk,
        jumlah: parseNumber(it.jumlah),
        harga: parseNumber(it.harga),
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
      `Item pesananmu : ${itemsList}.`;
    const phoneDigits = `62${whatsapp.replace(/\D/g, '')}`;
    const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(waUrl);
    } catch {
      // no WhatsApp / can't open the link — order is already saved, so
      // just continue to Event Detail rather than blocking on this.
    }

    router.replace({ pathname: '/event-detail', params: { id: event.id } });
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

          <View className="gap-[4px]">
            <Text className="font-inter text-[12px] text-neutral-800">Order form</Text>
            {/* TODO: parse pasted order text into the fields below automatically */}
            <Input
              value={orderFormText}
              onChangeText={setOrderFormText}
              placeholder="Copy Paste text order form disini."
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              className="h-[114px] rounded-[8px] border-neutral-400 bg-white p-[10px] text-[12px] text-neutral-800 shadow-none"
            />
          </View>

          <Text className="font-inter text-[12px] text-neutral-800">
            Atau isi manual form dibawah ini:
          </Text>

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
                <View className="gap-[4px]">
                  <Text className="font-inter text-[12px] text-neutral-800">Nama produk</Text>
                  <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                    <Input
                      value={item.namaProduk}
                      onChangeText={(v) => updateItem(item.key, { namaProduk: v })}
                      placeholder="item"
                      placeholderTextColor="#9ca3af"
                      className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                    />
                  </View>
                </View>

                <View className="flex-row items-start gap-[8px]">
                  <View className="w-[64px] gap-[4px]">
                    <Text className="font-inter text-[12px] text-neutral-800">Jumlah</Text>
                    {/* Wrapper View owns the border/padding (matching Harga
                      and Fee Jastip below) rather than styling Input
                      directly — a bare bordered Input renders ~3.5px
                      shorter here (the shared Input component's baked-in
                      `sm:h-9` fights our `h-auto` override on wide
                      viewports; the DOM <input> ends up height:36px
                      either way, but the two container constructions
                      compute a different box height around it). */}
                    <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Input
                        value={item.jumlah}
                        onChangeText={(v) => updateItem(item.key, { jumlah: v })}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                  </View>
                  <View className="w-[100px] gap-[4px]">
                    <Text className="font-inter text-[12px] text-neutral-800">Harga</Text>
                    <View className="flex-row items-center gap-[4px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Text className="font-inter text-[12px] text-neutral-400">IDR</Text>
                      <Input
                        value={item.harga}
                        onChangeText={(v) => updateItem(item.key, { harga: v })}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        className="h-auto flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                  </View>
                  <View className="flex-1 gap-[4px]">
                    <Text className="font-inter text-[12px] text-neutral-800">Fee Jastip</Text>
                    <View className="flex-row gap-[4px]">
                      <Pressable
                        ref={(el) => {
                          feeTriggerRefs.current[item.key] = el;
                        }}
                        onPress={() => openFeeDropdown(item.key)}
                        className={cn(
                          'flex-row items-center gap-[4px] rounded-[8px] border bg-white p-[10px]',
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
              </View>
            ))}

            <Pressable
              onPress={() => setItems((prev) => [...prev, blankItem()])}
              className="items-center rounded-[8px] border border-orange-400 bg-orange-50 px-[10px] py-[10px]">
              <Text className="font-inter text-[12px] text-orange-500">+Tambah</Text>
            </Pressable>
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
    </>
  );
}
