import CheckSquareIcon from '@/assets/images/figma/icon-check-square.svg';
import BrandLogo from '@/assets/images/figma/justipers-logo.svg';
import { Text } from '@/components/ui/text';
import { formatPrintTimestamp } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { ONGKIR_OPTIONS } from '@/lib/ongkir';
import type { ReceiptSnapshot } from '@/lib/receipt-link';
import * as React from 'react';
import { View } from 'react-native';

type TagihanReceiptProps = {
  // Everything the receipt prints (lib/receipt-link.ts). Both the
  // jastiper's in-app preview and the customer's public page render from
  // one of these, so the two can't drift apart.
  snapshot: ReceiptSnapshot;
  // The jastiper's logo slot. The public page passes nothing: the logo
  // can't travel in the link, and Figma's grey "Logo Jastiper"
  // placeholder would look broken to a customer.
  logo?: React.ReactNode;
};

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

// Figma node 181:175 "Cetak struk tagihan" — the customer's bill, laid
// out as a receipt up to 390px wide. Shown by app/tagihan.tsx (jastiper)
// and app/r.tsx (customer).
function TagihanReceipt({ snapshot, logo }: TagihanReceiptProps) {
  const t = useT();
  // In the currency the bill was made in, which a customer's device can't
  // know otherwise (lib/receipt-link.ts).
  const money = (amount: number) => formatMoney(amount, snapshot.cu ?? 'IDR');
  // The ticked "Pembayaran ongkos kirim" option, if any; the Ongkos kirim
  // block is left off the receipt when none is ticked.
  const ongkirOption = ONGKIR_OPTIONS.find((o) => o.value === snapshot.ok);
  const ongkirLabel = ongkirOption ? t(ongkirOption.label) : null;

  return (
    <View className="w-full max-w-[390px] bg-white pb-[24px]">
      <View className="items-center gap-[24px] py-[24px]">
        <View className="w-full items-center gap-[11px]">
          {logo}
          <Text className="font-inter text-[14px] text-neutral-800">{snapshot.nj}</Text>
          {snapshot.tj ? (
            <Text className="font-inter text-[12px] text-neutral-800">+62{snapshot.tj}</Text>
          ) : null}
          <Text className="font-inter text-[12px] text-neutral-800">
            {t('Waktu cetak')} : {formatPrintTimestamp(new Date(snapshot.t))}
          </Text>
        </View>

        <DashedLine />

        <View className="w-full gap-[10px]">
          <InfoRow label={t('Nama acara')}>{snapshot.ea}</InfoRow>
          <InfoRow label={t('Tanggal acara')}>{snapshot.ed}</InfoRow>
          <InfoRow label={t('Nomor order')}>
            <Text className="font-inter-bold text-[12px] text-neutral-800">{snapshot.on}</Text>
          </InfoRow>
          <InfoRow label={t('Nama customer')}>{snapshot.cn}</InfoRow>
          <InfoRow label={t('Alamat')}>{snapshot.al}</InfoRow>
          <InfoRow label={t('Total pesanan')}>{t('{n} items', { n: snapshot.it.length })}</InfoRow>
          <InfoRow label={t('Status pembayaran')}>
            <Text className="font-inter-bold text-[12px] text-neutral-800">
              {snapshot.lu ? t('Lunas') : snapshot.bl ? t('Belum lunas') : t('Belum bayar')}
            </Text>
          </InfoRow>
        </View>

        <DashedLine />

        <View className="w-full gap-[11px] px-[16px]">
          {ongkirLabel ? (
            <>
              <Text className="font-inter-bold text-[14px] text-[#1e1e1e]">
                {t('Ongkos kirim')}
              </Text>
              <View className="gap-[8px]">
                <View className="flex-row items-center gap-[5px]">
                  <CheckSquareIcon width={12} height={12} />
                  <Text className="font-inter text-[10px] text-neutral-800">
                    {t('Ongkos kirim')} : {ongkirLabel}
                  </Text>
                </View>
                {snapshot.og > 0 ? (
                  <Text className="font-inter text-[10px] text-neutral-800">
                    {money(snapshot.og)}
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}

          <Text className="font-inter-bold text-[14px] text-[#1e1e1e]">{t('List pesanan')}</Text>
          {snapshot.it.map(([namaProduk, jumlah, perUnitInclFee], index) => (
            <React.Fragment key={index}>
              <View className="gap-[8px]">
                <View className="flex-row items-center gap-[5px]">
                  <CheckSquareIcon width={12} height={12} />
                  <Text className="flex-1 font-inter text-[10px] text-neutral-800">
                    {namaProduk}
                  </Text>
                </View>
                <View className="flex-row gap-[8px]">
                  <Text className="font-inter text-[10px] text-neutral-800">{jumlah}x</Text>
                  <Text className="font-inter text-[10px] text-neutral-800">
                    {money(perUnitInclFee)}*
                  </Text>
                </View>
              </View>
              <View className="w-full border-t border-neutral-400" />
            </React.Fragment>
          ))}

          <View className="gap-[6px]">
            <Text className="font-inter-bold text-[10px] text-neutral-800">
              {t('Total tagihan yang harus dibayar')}
            </Text>
            <Text className="font-inter text-[12px] text-neutral-800">{money(snapshot.tt)}</Text>
          </View>
          {/* A DP already paid, and what is left to pay. */}
          {!snapshot.lu && (snapshot.dp ?? 0) > 0 ? (
            <>
              <View className="gap-[6px]">
                <Text className="font-inter-bold text-[10px] text-neutral-800">
                  {t('DP sudah dibayar')}
                </Text>
                <Text className="font-inter text-[12px] text-neutral-800">
                  {money(snapshot.dp ?? 0)}
                </Text>
              </View>
              <View className="gap-[6px]">
                <Text className="font-inter-bold text-[10px] text-neutral-800">
                  {t('Sisa pembayaran')}
                </Text>
                <Text className="font-inter text-[12px] text-neutral-800">
                  {money(Math.max(0, snapshot.tt - (snapshot.dp ?? 0)))}
                </Text>
              </View>
            </>
          ) : null}
          {/* The DP came to more than the bill: the difference goes back to
              the customer. */}
          {(snapshot.dp ?? 0) > snapshot.tt ? (
            <View className="gap-[6px]">
              <Text className="font-inter-bold text-[10px] text-neutral-800">
                {t('Kelebihan bayar (dikembalikan ke pelanggan)')}
              </Text>
              <Text className="font-inter text-[12px] text-neutral-800">
                {money((snapshot.dp ?? 0) - snapshot.tt)}
              </Text>
            </View>
          ) : null}
          <Text className="font-inter text-[10px] text-[#1e1e1e]">
            {t('*Harga sudah termasuk jastip fee')}
          </Text>
        </View>

        <DashedLine />
      </View>

      <View className="items-center">
        <Text className="font-poppins text-[12px] text-neutral-500">Powered by:</Text>
        <BrandLogo width={80.89} height={28} />
      </View>
    </View>
  );
}

export { TagihanReceipt };
