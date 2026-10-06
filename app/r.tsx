import { TagihanReceipt } from '@/components/tagihan-receipt';
import { Text } from '@/components/ui/text';
import { decodeReceiptSnapshot, type ReceiptSnapshot } from '@/lib/receipt-link';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import * as React from 'react';
import { Platform, ScrollView, View } from 'react-native';

// The customer's side of "Cetak tagihan customer": a public, read-only
// receipt page, opened from the link the jastiper sends (built in
// app/tagihan.tsx). Deliberately not part of the jastiper's app — no
// login, no navigation back into it, nothing read from this device's
// storage. Everything shown comes out of the link itself, after the "#"
// (lib/receipt-link.ts); `?d=` is accepted too for platforms without a
// URL fragment.
export default function PublicReceiptScreen() {
  const { d } = useLocalSearchParams<{ d?: string }>();
  // undefined = not read yet (the static HTML is rendered without a URL
  // fragment, so it can only be read after mount), null = unreadable link.
  const [snapshot, setSnapshot] = React.useState<ReceiptSnapshot | null | undefined>(undefined);

  React.useEffect(() => {
    const fromHash = Platform.OS === 'web' ? window.location.hash.slice(1) : '';
    const encoded = fromHash || d || '';
    setSnapshot(encoded ? decodeReceiptSnapshot(encoded) : null);
  }, [d]);

  return (
    <View className="flex-1 bg-white">
      {Platform.OS === 'web' ? (
        <Head>
          <title>{snapshot ? `Tagihan ${snapshot.on} - ${snapshot.nj}` : 'Tagihan'}</title>
          <meta name="robots" content="noindex" />
        </Head>
      ) : null}

      {snapshot === null ? (
        <View className="flex-1 items-center justify-center gap-[8px] px-[20px]">
          <Text className="font-inter-bold text-[16px] text-neutral-900">
            Tagihan tidak ditemukan
          </Text>
          <Text className="text-center font-inter text-[12px] text-neutral-600">
            Link tagihan ini tidak lengkap atau rusak. Minta jastiper mengirim ulang linknya.
          </Text>
        </View>
      ) : snapshot ? (
        <ScrollView contentContainerClassName="items-center pb-[24px]">
          <TagihanReceipt snapshot={snapshot} />
        </ScrollView>
      ) : null}
    </View>
  );
}
