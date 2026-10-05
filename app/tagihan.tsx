import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { TagihanReceipt } from '@/components/tagihan-receipt';
import { Text } from '@/components/ui/text';
import { useEvents } from '@/lib/events-store';
import { useSettings } from '@/lib/settings-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

// Preview of the customer's bill (Figma node 181:175), opened in place
// by Order Detail's "Cetak tagihan customer" button. Replaces the earlier
// "save the receipt as an image" behaviour, which didn't work in mobile
// browsers.
export default function TagihanScreen() {
  const router = useRouter();
  const { getEvent, getOrder } = useEvents();
  const { userProfile } = useSettings();
  const { eventId, orderId } = useLocalSearchParams<{ eventId?: string; orderId?: string }>();
  const event = eventId ? getEvent(eventId) : undefined;
  const order = eventId && orderId ? getOrder(eventId, orderId) : undefined;
  const printedAt = React.useMemo(() => new Date(), []);

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

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerClassName="items-center pb-[24px]">
        <Pressable onPress={handleBack} hitSlop={8} className="w-full px-[16px] pt-[20px]">
          <CaretCircleLeftIcon width={24} height={24} />
        </Pressable>
        <TagihanReceipt
          event={event}
          order={order}
          namaJastip={userProfile.namaJastip || 'Jastip by Juli'}
          teleponJastip={userProfile.telepon ?? ''}
          printedAt={printedAt}
        />
      </ScrollView>
    </View>
  );
}
