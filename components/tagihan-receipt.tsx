import CheckSquareIcon from '@/assets/images/figma/icon-check-square.svg';
import ShopperLogo from '@/assets/images/figma/shopper-logo.svg';
import { JastiperLogo } from '@/components/jastiper-logo';
import { Text } from '@/components/ui/text';
import {
  computeItemTotals,
  getTotalTagihan,
  type JastipEvent,
  type Order,
} from '@/lib/events-store';
import { formatDateRange, formatIDR, formatPrintTimestamp } from '@/lib/format';
import { ONGKIR_OPTIONS } from '@/lib/ongkir';
import * as React from 'react';
import { View } from 'react-native';

type TagihanReceiptProps = {
  event: JastipEvent;
  order: Order;
  namaJastip: string;
  // Local digits of the jastiper's number from Pengaturan; the line is
  // left off the receipt when it's empty.
  teleponJastip: string;
  printedAt: Date;
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
// out as a receipt up to 390px wide. Shown by app/tagihan.tsx.
function TagihanReceipt({
  event,
  order,
  namaJastip,
  teleponJastip,
  printedAt,
}: TagihanReceiptProps) {
  // The ticked "Pembayaran ongkos kirim" option, if any; the Ongkos kirim
  // block is left off the receipt when none is ticked.
  const ongkirLabel =
    ONGKIR_OPTIONS.find((o) => o.value === order.pembayaranOngkir)?.label ?? null;
  // Ongkir billed upfront; 0 unless "Bayar ongkir di awal" is ticked.
  const ongkirDitagih = order.pembayaranOngkir === 'awal' ? (order.ongkir ?? 0) : 0;
  const totalTagihan = getTotalTagihan(order);

  return (
    <View className="w-full max-w-[390px] bg-white pb-[24px]">
      <View className="items-center gap-[24px] py-[24px]">
        <View className="w-full items-center gap-[11px]">
          <JastiperLogo />
          <Text className="font-inter text-[14px] text-neutral-800">{namaJastip}</Text>
          {teleponJastip ? (
            <Text className="font-inter text-[12px] text-neutral-800">+62{teleponJastip}</Text>
          ) : null}
          <Text className="font-inter text-[12px] text-neutral-800">
            Waktu cetak : {formatPrintTimestamp(printedAt)}
          </Text>
        </View>

        <DashedLine />

        <View className="w-full gap-[10px]">
          <InfoRow label="Nama acara">{event.namaAcara}</InfoRow>
          <InfoRow label="Tanggal acara">
            {formatDateRange(event.tanggalDari, event.tanggalSampai)}
          </InfoRow>
          <InfoRow label="Nomor order">
            <Text className="font-inter-bold text-[12px] text-neutral-800">
              {order.orderNumber}
            </Text>
          </InfoRow>
          <InfoRow label="Nama customer">{order.nama}</InfoRow>
          <InfoRow label="Alamat">{order.alamat}</InfoRow>
          <InfoRow label="Total pesanan">{order.items.length} items</InfoRow>
          <InfoRow label="Status pembayaran">
            <Text className="font-inter-bold text-[12px] text-neutral-800">
              {order.statusPembayaran === 'lunas' ? 'Lunas' : 'Belum bayar'}
            </Text>
          </InfoRow>
        </View>

        <DashedLine />

        <View className="w-full gap-[11px] px-[16px]">
          {ongkirLabel ? (
            <>
              <Text className="font-inter-bold text-[14px] text-[#1e1e1e]">Ongkos kirim</Text>
              <View className="gap-[8px]">
                <View className="flex-row items-center gap-[5px]">
                  <CheckSquareIcon width={12} height={12} />
                  <Text className="font-inter text-[10px] text-neutral-800">
                    Ongkos kirim : {ongkirLabel}
                  </Text>
                </View>
                {ongkirDitagih > 0 ? (
                  <Text className="font-inter text-[10px] text-neutral-800">
                    {formatIDR(ongkirDitagih)}
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}

          <Text className="font-inter-bold text-[14px] text-[#1e1e1e]">List pesanan</Text>
          {order.items.map((item) => {
            const { fee } = computeItemTotals(item);
            // Same "price already includes the jastip fee" per-unit figure
            // as app/cetak-penanda.tsx.
            const perUnitInclFee = item.harga + fee / item.jumlah;
            return (
              <React.Fragment key={item.id}>
                <View className="gap-[8px]">
                  <View className="flex-row items-center gap-[5px]">
                    <CheckSquareIcon width={12} height={12} />
                    <Text className="flex-1 font-inter text-[10px] text-neutral-800">
                      {item.namaProduk}
                    </Text>
                  </View>
                  <View className="flex-row gap-[8px]">
                    <Text className="font-inter text-[10px] text-neutral-800">{item.jumlah}x</Text>
                    <Text className="font-inter text-[10px] text-neutral-800">
                      {formatIDR(perUnitInclFee)}*
                    </Text>
                  </View>
                </View>
                <View className="w-full border-t border-neutral-400" />
              </React.Fragment>
            );
          })}

          <View className="gap-[6px]">
            <Text className="font-inter-bold text-[10px] text-neutral-800">
              Total tagihan yang harus dibayar
            </Text>
            <Text className="font-inter text-[12px] text-neutral-800">
              {formatIDR(totalTagihan)}
            </Text>
          </View>
          <Text className="font-inter text-[10px] text-[#1e1e1e]">
            *Harga sudah termasuk jastip fee
          </Text>
        </View>

        <DashedLine />
      </View>

      <View className="items-center">
        <Text className="font-poppins text-[12px] text-neutral-500">Powered by:</Text>
        <ShopperLogo width={143.723} height={22.919} />
      </View>
    </View>
  );
}

export { TagihanReceipt };
