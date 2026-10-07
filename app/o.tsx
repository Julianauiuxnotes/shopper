import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import PaperPlaneTiltIcon from '@/assets/images/figma/icon-paper-plane-tilt.svg';
import SparkleIcon from '@/assets/images/figma/icon-sparkle.svg';
import ShopperLogo from '@/assets/images/figma/shopper-logo.svg';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { decodeOrderFormInfo, type OrderFormInfo } from '@/lib/order-form-link';
import { submitOrder, type SubmittedOrder } from '@/lib/order-inbox';
import { cn } from '@/lib/utils';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

// The customer's side of an event's "Bagikan form order jastip" link
// (Figma section 63:4140 "ORDER FORM - CUSTOMER SIDE"): a public order
// form, opened from the link the jastiper shares on Event Detail. Like
// the public receipt (app/r.tsx) it is not part of the jastiper's app —
// no login, nothing read from this device's storage; the event details
// come out of the link itself (lib/order-form-link.ts).
//
// "Buat pesanan" sends the order to the jastiper's order inbox on the
// server (lib/order-inbox.ts); the jastiper's app collects it from there
// and it shows up as a new order on the event. The bukti has no order
// number, unlike Figma's: numbers are assigned by the jastiper's app when
// it collects the order, after this page is done.
//
// Not shown from Figma: the jastiper's logo and the event photo. Both
// are images stored on the jastiper's device and can't travel in a link.

type ItemDraft = { key: string; namaProduk: string; jumlah: string };

let nextItemKey = 0;
function blankItem(): ItemDraft {
  nextItemKey += 1;
  return { key: `item-${nextItemKey}`, namaProduk: '', jumlah: '' };
}

function PoweredBy({ className }: { className?: string }) {
  return (
    <View className={cn('items-end', className)}>
      <Text className="font-poppins text-[7px] leading-[10px] text-orange-500">Powered by:</Text>
      <ShopperLogo width={72.314} height={11.532} />
    </View>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-start gap-[3px] px-[16px]">
      <Text className="w-[131px] font-inter text-[12px] text-neutral-800">{label}</Text>
      <Text className="flex-1 font-inter text-[12px] text-neutral-800">: {children}</Text>
    </View>
  );
}

function DashedLine() {
  return <View className="w-full border-t-2 border-dashed border-neutral-500" />;
}

export default function CustomerOrderFormScreen() {
  const { d } = useLocalSearchParams<{ d?: string }>();
  // undefined = not read yet (the static HTML is rendered without a URL
  // fragment, so it can only be read after mount), null = unreadable link.
  const [info, setInfo] = React.useState<OrderFormInfo | null | undefined>(undefined);

  React.useEffect(() => {
    const fromHash = Platform.OS === 'web' ? window.location.hash.slice(1) : '';
    const encoded = fromHash || d || '';
    setInfo(encoded ? decodeOrderFormInfo(encoded) : null);
  }, [d]);

  const [nama, setNama] = React.useState('');
  const [alamat, setAlamat] = React.useState('');
  const [whatsapp, setWhatsapp] = React.useState('');
  const [metodePengiriman, setMetodePengiriman] = React.useState<'instant' | 'ekspedisi' | null>(
    null
  );
  const [items, setItems] = React.useState<ItemDraft[]>([blankItem()]);
  // 'form' → 'sent' (after Buat pesanan) → 'bukti' (the order summary)
  const [step, setStep] = React.useState<'form' | 'sent' | 'bukti'>('form');
  const [submitted, setSubmitted] = React.useState<SubmittedOrder | null>(null);

  function updateItem(key: string, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  const validItems = items
    .map((it) => ({ namaProduk: it.namaProduk.trim(), jumlah: Number(it.jumlah) || 0 }))
    .filter((it) => it.namaProduk.length > 0 && it.jumlah > 0);

  const isValid =
    nama.trim().length > 0 &&
    alamat.trim().length > 0 &&
    whatsapp.length >= 8 &&
    metodePengiriman !== null &&
    validItems.length > 0;

  const [sending, setSending] = React.useState(false);
  const [sendFailed, setSendFailed] = React.useState(false);

  async function handleSubmit() {
    if (!info || !isValid || !metodePengiriman || sending) return;
    const order: SubmittedOrder = {
      nama: nama.trim(),
      alamat: alamat.trim(),
      whatsapp,
      metodePengiriman,
      items: validItems,
    };
    setSending(true);
    setSendFailed(false);
    try {
      await submitOrder(info.inboxId, info.kodeEvent, order);
      setSubmitted(order);
      setStep('sent');
    } catch {
      // Stays on the form with everything still filled in, to try again.
      setSendFailed(true);
    } finally {
      setSending(false);
    }
  }

  const title = info ? `Form order ${info.namaAcara} - ${info.namaJastip}` : 'Form order';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {Platform.OS === 'web' ? (
        <Head>
          <title>{title}</title>
          <meta name="robots" content="noindex" />
        </Head>
      ) : null}

      {info === null ? (
        <View className="flex-1 items-center justify-center gap-[8px] px-[20px]">
          <Text className="font-inter-bold text-[16px] text-neutral-900">
            Form order tidak ditemukan
          </Text>
          <Text className="text-center font-inter text-[12px] text-neutral-600">
            Link form order ini tidak lengkap atau rusak. Minta jastiper mengirim ulang linknya.
          </Text>
        </View>
      ) : !info ? null : step === 'form' ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-[24px] pb-[18px] pt-[12px]"
          keyboardShouldPersistTaps="handled">
          <View className="gap-[12px] px-[28px]">
            <View className="h-[47px] flex-row items-center justify-between">
              <Text
                numberOfLines={2}
                className="flex-1 pr-[12px] font-inter-bold text-[14px] text-neutral-800">
                {info.namaJastip}
              </Text>
              <PoweredBy />
            </View>
            <View className="gap-[10px] rounded-[12px] bg-orange-500 p-[20px]">
              <Text className="font-inter-bold text-[16px] text-neutral-50">{info.namaAcara}</Text>
              <View className="gap-[4px]">
                <Text className="font-inter text-[12px] text-neutral-50">Tanggal acara</Text>
                <Text className="font-inter-semibold text-[14px] text-neutral-50">
                  {info.tanggalAcara}
                </Text>
              </View>
              <View className="gap-[4px]">
                <Text className="font-inter text-[12px] text-neutral-50">Lokasi</Text>
                <Text className="font-inter-semibold text-[14px] text-neutral-50">
                  {info.lokasi}
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-[22px] px-[28px]">
            <Text className="font-inter-semibold text-[14px] text-neutral-800">
              Isi detail pesanan dibawah ini:
            </Text>

            <View className="gap-[4px]">
              <Text className="font-inter text-[12px] text-[#1e1e1e]">Nama</Text>
              <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                <Input
                  value={nama}
                  onChangeText={setNama}
                  placeholder="Nama"
                  placeholderTextColor="#9ca3af"
                  className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                />
              </View>
            </View>

            <View className="gap-[4px]">
              <Text className="font-inter text-[12px] text-[#1e1e1e]">Alamat</Text>
              <View className="h-[75px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                <Input
                  value={alamat}
                  onChangeText={setAlamat}
                  placeholder="Alamat"
                  placeholderTextColor="#9ca3af"
                  multiline
                  textAlignVertical="top"
                  style={{ height: '100%' }}
                  className="flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                />
              </View>
            </View>

            <View className="gap-[4px]">
              <Text className="font-inter text-[12px] text-[#1e1e1e]">No. Whatsapp</Text>
              <View className="flex-row items-center gap-[10px] rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                <Text className="font-inter text-[12px] text-neutral-400">+62</Text>
                <Input
                  value={whatsapp}
                  onChangeText={(v) => setWhatsapp(v.replace(/\D/g, '').replace(/^0+/, ''))}
                  placeholder="81234567890"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                />
              </View>
            </View>

            <View className="gap-[10px]">
              <Text className="font-inter text-[12px] text-[#1e1e1e]">Metode pengiriman</Text>
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
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
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

            <View className="gap-[8px]">
              <Text className="font-inter-bold text-[14px] text-[#1e1e1e]">List pesanan</Text>
              {items.map((item, index) => (
                <View key={item.key} className="flex-row items-start gap-[8px]">
                  <View className="flex-1 gap-[4px]">
                    {index === 0 ? (
                      <Text className="font-inter text-[12px] text-[#1e1e1e]">Nama produk</Text>
                    ) : null}
                    <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Input
                        value={item.namaProduk}
                        onChangeText={(v) => updateItem(item.key, { namaProduk: v })}
                        placeholder="item"
                        placeholderTextColor="#9ca3af"
                        accessibilityLabel={`Nama produk ${index + 1}`}
                        className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                  </View>
                  <View className="w-[52px] gap-[4px]">
                    {index === 0 ? (
                      <Text className="font-inter text-[12px] text-[#1e1e1e]">Jumlah</Text>
                    ) : null}
                    <View className="rounded-[8px] border border-neutral-400 bg-white p-[10px]">
                      <Input
                        value={item.jumlah}
                        onChangeText={(v) =>
                          updateItem(item.key, { jumlah: v.replace(/\D/g, '').slice(0, 3) })
                        }
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                        accessibilityLabel={`Jumlah produk ${index + 1}`}
                        className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
                      />
                    </View>
                  </View>
                </View>
              ))}
              <Pressable
                onPress={() => setItems((prev) => [...prev, blankItem()])}
                accessibilityRole="button"
                className="w-[82px] items-center rounded-[8px] border border-orange-400 bg-orange-50 p-[10px]">
                <Text className="font-inter text-[12px] text-orange-500">+Tambah</Text>
              </Pressable>
            </View>
          </View>

          <View className="px-[22px] pt-[16px]">
            <Pressable
              onPress={handleSubmit}
              disabled={!isValid || sending}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isValid || sending, busy: sending }}
              className={cn(
                'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                isValid ? 'bg-orange-500' : 'bg-orange-200'
              )}>
              <Text
                className={cn(
                  'font-inter-semibold text-[14px]',
                  isValid ? 'text-white' : 'text-orange-300'
                )}>
                {sending ? 'Mengirim pesanan...' : 'Buat pesanan'}
              </Text>
            </Pressable>
            {sendFailed ? (
              <Text className="pt-[8px] text-center font-inter text-[12px] text-red-500">
                Pesanan belum terkirim. Cek koneksi internet, lalu coba lagi.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      ) : step === 'sent' ? (
        <View className="flex-1 items-center justify-center px-[28px]">
          <View className="w-full max-w-[260px] items-center gap-[49px]">
            <View className="items-center gap-[15px]">
              {/* Figma 62:4109: the 60px paper plane sits 10px below the
                  top of its box, with the 24px sparkle at the top-left. */}
              <View className="h-[70px] w-[60px]">
                <View className="absolute left-0 top-[10px]">
                  <PaperPlaneTiltIcon width={60} height={60} />
                </View>
                <View className="absolute left-[2px] top-0">
                  <SparkleIcon width={24} height={24} />
                </View>
              </View>
              <Text className="text-center font-inter-semibold text-[16px] text-neutral-800">
                Pesananmu sudah tercatat!
              </Text>
              <Text className="text-center font-inter text-[14px] text-neutral-700">
                Hi, list pesananmu sudah terkirim ke Jastiper. Tunggu konfirmasi dari Jastiper untuk
                konfirmasi pesanan dan pembayaran ya.
              </Text>
            </View>
            <View className="w-full gap-[10px]">
              <Pressable
                onPress={() => setStep('bukti')}
                accessibilityRole="button"
                className="h-[49px] w-full items-center justify-center rounded-[12px] bg-orange-500 px-[10px]">
                <Text className="font-inter-semibold text-[14px] text-white">
                  Lihat bukti pesanan
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : submitted ? (
        <ScrollView contentContainerClassName="items-center pb-[24px]">
          <Pressable
            onPress={() => setStep('sent')}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            hitSlop={8}
            className="w-full px-[16px] pt-[20px]">
            <CaretCircleLeftIcon width={24} height={24} />
          </Pressable>
          {/* Figma 62:3888 "Download bukti pesanan". */}
          <View className="w-full max-w-[390px] items-center gap-[24px] py-[24px]">
            <View className="w-full items-center gap-[11px]">
              <View className="items-center gap-[8px] px-[16px]">
                <Text className="text-center font-inter text-[14px] text-neutral-800">
                  {info.namaJastip}
                </Text>
                {info.whatsappJastip ? (
                  <Text className="font-inter text-[14px] text-neutral-800">
                    +62{info.whatsappJastip}
                  </Text>
                ) : null}
              </View>
              <DashedLine />
              <Text className="pt-[12px] font-inter-bold text-[16px] text-orange-500">
                Bukti cetak pesanan
              </Text>
            </View>

            <DashedLine />

            <View className="w-full gap-[10px]">
              <InfoRow label="Nama acara">{info.namaAcara}</InfoRow>
              <InfoRow label="Tanggal acara">{info.tanggalAcara}</InfoRow>
              <InfoRow label="Nama customer">{submitted.nama}</InfoRow>
              <InfoRow label="Alamat">{submitted.alamat}</InfoRow>
              <InfoRow label="Total pesanan">{submitted.items.length} items</InfoRow>
              <InfoRow label="Status pembayaran">Menunggu konfirmasi dan total pembayaran</InfoRow>
            </View>

            <DashedLine />

            <View className="w-full gap-[11px] px-[16px]">
              <Text className="font-inter-bold text-[14px] text-[#1e1e1e]">List pesanan</Text>
              <View className="flex-row gap-[8px]">
                <Text className="flex-1 font-inter-semibold text-[12px] text-neutral-500">
                  Nama produk
                </Text>
                <Text className="w-[44px] font-inter-semibold text-[12px] text-neutral-500">
                  Jumlah
                </Text>
              </View>
              {submitted.items.map((item, index) => (
                <View
                  key={index}
                  className={cn(
                    'flex-row gap-[8px]',
                    index > 0 && 'border-t border-neutral-400 pt-[11px]'
                  )}>
                  <Text className="flex-1 font-inter text-[12px] text-[#1e1e1e]">
                    {item.namaProduk}
                  </Text>
                  <Text className="w-[44px] font-inter text-[12px] text-[#1e1e1e]">
                    {item.jumlah}
                  </Text>
                </View>
              ))}
            </View>

            <DashedLine />
          </View>

          <View className="items-center pt-[16px]">
            <Text className="font-poppins text-[12px] text-orange-500">Powered by:</Text>
            <ShopperLogo width={143.723} height={22.919} />
          </View>
        </ScrollView>
      ) : null}
    </KeyboardAvoidingView>
  );
}
