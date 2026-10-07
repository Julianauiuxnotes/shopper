import MenuIcon from '@/assets/images/figma/icon-menu.svg';
import XCircleIcon from '@/assets/images/figma/icon-x-circle.svg';
import { SideDrawer } from '@/components/ui/side-drawer';
import { Text } from '@/components/ui/text';
import { useEvents } from '@/lib/events-store';
import { formatDateRange, formatIDR, isDateInRange } from '@/lib/format';
import { useAuth } from '@/lib/auth-store';
import { useSettings } from '@/lib/settings-store';
import { cn } from '@/lib/utils';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

// Figma node 31:458 "Dashboard Empty" / 53:3182 "Dashboard Filled"
// (section DASHBOARD, fileKey HbQCCdkrJDE9BzznluMmz8). Which one renders
// depends on the shared events store (lib/events-store.tsx) — empty
// before any event is created, filled once one exists, matching what the
// user asked for ("when there is an event created"). The avatar (a flat
// #d9d9d9 circle in Figma) is rendered natively rather than as an SVG
// asset. The second "List" icon (x=404 in the 390px frame) is off-canvas
// in the source design, same as on Splash/Sign Up, so only the in-bounds
// one (x=347) is rendered here. The greeting name was "Jastip by Juli"
// as static mockup text from the original Figma pull — now reads the
// real signed-up `namaJastip` (lib/settings-store.tsx) instead, with
// that same string as a fallback for the pre-sign-up empty state.
export default function DashboardScreen() {
  const router = useRouter();
  const { events } = useEvents();
  const { userProfile } = useSettings();
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const hasEvents = events.length > 0;

  const totalRevenue = events.reduce((sum, e) => sum + e.revenue, 0);
  const totalProfit = events.reduce((sum, e) => sum + e.profit, 0);
  const totalOrder = events.reduce((sum, e) => sum + e.totalOrder, 0);
  const today = new Date();
  const ongoingEvent = events.find((e) => isDateInRange(today, e.tanggalDari, e.tanggalSampai));

  return (
    <>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="gap-[20px] px-[20px] pb-[40px] pt-[20px]">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-[6px]">
            <View className="size-[34px] rounded-full bg-[#d9d9d9]" />
            <View>
              <Text className="font-inter-bold text-[10px] text-black">Hallo!</Text>
              <Text className="font-inter-semibold text-[16px] text-orange-500">
                {userProfile.namaJastip || 'Jastip by Juli'}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={8}>
            <MenuIcon width={24} height={24} />
          </Pressable>
        </View>

        <View className="gap-[14px] rounded-[12px] bg-orange-200 p-[20px]">
          <View className="flex-row justify-between">
            <View className="gap-[6px]">
              <Text className="font-inter text-[12px] text-neutral-800">
                Total Revenue (Bulan ini)
              </Text>
              <Text className="font-inter-bold text-[14px] text-neutral-800">
                {formatIDR(totalRevenue)}
              </Text>
            </View>
            <View className="gap-[6px]">
              <Text className="font-inter text-[12px] text-neutral-800">Profit</Text>
              <Text className="font-inter-bold text-[14px] text-neutral-800">
                {formatIDR(totalProfit)}
              </Text>
            </View>
          </View>

          <View className="gap-[6px]">
            <Text className="font-inter text-[12px] text-neutral-800">Sedang berlangsung</Text>
            <View
              className={cn(
                'self-start rounded-[12px] px-[10px] py-[2px]',
                ongoingEvent ? 'bg-orange-500' : 'bg-white'
              )}>
              <Text
                className={cn(
                  'font-inter text-[12px] italic',
                  ongoingEvent ? 'text-neutral-50' : 'text-orange-500'
                )}>
                {ongoingEvent ? ongoingEvent.namaAcara : 'Belum ada'}
              </Text>
            </View>
          </View>

          <View className="gap-[6px]">
            <Text className="font-inter text-[12px] text-neutral-800">Total order</Text>
            <Text className="font-inter-bold text-[14px] text-neutral-800">{totalOrder}</Text>
          </View>
        </View>

        <Link href="/buka-event-jastip" asChild>
          <Pressable className="w-full items-center justify-center rounded-[12px] bg-orange-500 px-[10px] py-[16px]">
            <Text className="font-inter-semibold text-[14px] text-orange-50">
              Buka event jastip
            </Text>
          </Pressable>
        </Link>

        {hasEvents ? (
          <View className="gap-[12px]">
            <Text className="font-inter-semibold text-[14px] text-neutral-800">
              List event jastip
            </Text>
            {events.map((event) => (
              <View key={event.id} className="gap-[12px] rounded-[12px] bg-orange-100 p-[16px]">
                <View className="flex-row">
                  <View className="flex-1 gap-[6px] pr-[12px]">
                    <Text className="font-inter-semibold text-[14px] text-neutral-800">
                      {event.namaAcara}
                    </Text>
                    <Text className="font-inter text-[12px] text-neutral-800">{event.lokasi}</Text>
                    <Text className="font-inter text-[12px] text-neutral-800">
                      {formatDateRange(event.tanggalDari, event.tanggalSampai)}
                    </Text>
                  </View>
                  <View className="w-px bg-neutral-400" />
                  <View className="gap-[8px] pl-[12px]">
                    <Text className="font-inter-bold text-[12px] text-neutral-800">
                      {event.kodeEvent}
                    </Text>
                    <View className="gap-[4px]">
                      <Text className="font-inter text-[12px] text-neutral-800">Total order</Text>
                      <Text className="font-inter-bold text-[12px] text-neutral-800">
                        {event.totalOrder}
                      </Text>
                    </View>
                  </View>
                </View>
                <Link href={{ pathname: '/event-detail', params: { id: event.id } }} asChild>
                  <Pressable className="w-full items-center justify-center rounded-[8px] bg-orange-500 px-[10px] py-[6px]">
                    <Text className="font-inter-semibold text-[10px] text-neutral-50">
                      Lihat detail
                    </Text>
                  </Pressable>
                </Link>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {menuOpen ? (
        <SideDrawer onClose={() => setMenuOpen(false)}>
          {(close) => (
            <View className="flex-1 items-end justify-between">
              <View className="w-full gap-[16px]">
                <View className="h-[84px] w-full items-end justify-start p-[4px]">
                  <Pressable onPress={() => close()} hitSlop={8}>
                    <XCircleIcon width={32} height={32} />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => close(() => router.push('/settings'))}
                  className="w-full items-start px-[10px] py-[16px]">
                  <Text className="font-inter-semibold text-[16px] text-white">
                    Pengaturan Akun
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => close(() => router.push('/pengaturan-publikasi'))}
                  className="w-full items-start px-[10px] py-[16px]">
                  <Text className="font-inter-semibold text-[16px] text-white">
                    Pengaturan Publikasi
                  </Text>
                </Pressable>

                <Pressable
                  // Signs out straight away rather than after the drawer's
                  // closing animation: components/auth-gate.tsx then sends
                  // the user to the welcome screen on its own.
                  onPress={() => {
                    signOut();
                    close();
                  }}
                  className="w-full items-start px-[10px] py-[16px]">
                  <Text className="font-inter-semibold text-[16px] text-white">Keluar</Text>
                </Pressable>
              </View>
            </View>
          )}
        </SideDrawer>
      ) : null}
    </>
  );
}
