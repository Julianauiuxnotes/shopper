import DividerVertical from '@/assets/images/figma/divider-vertical-44.svg';
import AlignLeftLine from '@/assets/images/figma/icon-align-left-line.svg';
import AlignLeftLineShort from '@/assets/images/figma/icon-align-left-line-short.svg';
import BasketIcon from '@/assets/images/figma/icon-basket.svg';
import MagnifyingGlassIcon from '@/assets/images/figma/icon-magnifying-glass.svg';
import XCircleIcon from '@/assets/images/figma/icon-x-circle.svg';
import { SideDrawer } from '@/components/ui/side-drawer';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useEvents, getEventProfit } from '@/lib/events-store';
import { formatDateRange, formatIDR, isDateInRange } from '@/lib/format';
import { useAuth } from '@/lib/auth-store';
import { useSettings } from '@/lib/settings-store';
import { cn } from '@/lib/utils';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';

const CARD_SHADOW = { boxShadow: '0px 2px 5.1px rgba(0, 0, 0, 0.25)' };
const CARD_FILL = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
} as const;
// The coin artwork is cropped slightly inside its 28x27 frame (Figma
// node 323:365).
const COIN_IMAGE = {
  position: 'absolute',
  left: -1.01,
  top: -1.22,
  width: 31.5,
  height: 31.5,
} as const;
const PAGE_SIZE = 10;
const BUTTON_SHADOW = { boxShadow: '0px 2px 2.55px rgba(0, 0, 0, 0.25)' };

// Figma node 31:458 "Dashboard Empty" / 322:61 "Dashboard Filled"
// (section DASHBOARD, fileKey HbQCCdkrJDE9BzznluMmz8; 322:61 replaced
// 53:3182 and added the token card). Which one renders
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
  const { userProfile, logoJastip } = useSettings();
  const { shop, beta, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const hasEvents = events.length > 0;
  // Search box over the event list: name, location or event code.
  const [query, setQuery] = React.useState('');
  const needle = query.trim().toLowerCase();
  const shownEvents = needle
    ? events.filter(
        (e) =>
          e.namaAcara.toLowerCase().includes(needle) ||
          e.lokasi.toLowerCase().includes(needle) ||
          e.kodeEvent.toLowerCase().includes(needle)
      )
    : events;
  // The list shows ten events at a time.
  const [page, setPage] = React.useState(1);
  const listRef = React.useRef<ScrollView>(null);
  const pageCount = Math.max(1, Math.ceil(shownEvents.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageEvents = shownEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(1, next), pageCount));
    listRef.current?.scrollTo({ y: 0, animated: false });
  };

  // "Jastip bulan ini": the card counts events that take place during the
  // current calendar month, i.e. whose dates fall at least partly in it.
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const eventsThisMonth = events.filter(
    (e) => e.tanggalDari < nextMonthStart && e.tanggalSampai >= monthStart
  );
  const totalRevenue = eventsThisMonth.reduce((sum, e) => sum + e.revenue, 0);
  const totalProfit = eventsThisMonth.reduce((sum, e) => sum + getEventProfit(e), 0);
  const totalOrder = eventsThisMonth.reduce((sum, e) => sum + e.totalOrder, 0);
  const ongoingEvent = events.find((e) => isDateInRange(today, e.tanggalDari, e.tanggalSampai));

  return (
    <>
      {/* Everything down to the search box stays put; only the list of
          events underneath scrolls. */}
      <View className="flex-1 bg-white">
        {/* The 16px at the bottom is the fixed gap under the search box. */}
        <View className="gap-[16px] px-[20px] pb-[16px] pt-[20px]">
          {/* Figma node 323:323. */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-[12px]">
              {/* The logo from Pengaturan, or the grey placeholder circle. */}
              {logoJastip ? (
                <Image
                  source={{ uri: logoJastip }}
                  resizeMode="cover"
                  style={{ width: 51, height: 51, borderRadius: 25.5 }}
                  accessibilityLabel="Logo jastip"
                />
              ) : (
                <View className="size-[51px] rounded-full bg-[#d9d9d9]" />
              )}
              <View>
                <Text className="font-inter-bold text-[10px] text-neutral-800">Hallo!</Text>
                <Text className="font-inter-semibold text-[16px] text-neutral-800">
                  {userProfile.namaJastip || 'Jastip by Juli'}
                </Text>
              </View>
            </View>
            {/* "align-left": three stroked lines, the last one shorter. */}
            <Pressable
              onPress={() => setMenuOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Buka menu"
              className="w-[44px] items-center justify-center p-[10px]">
              <View className="h-[22px] w-[24px] gap-[5px] px-[3px] py-[6px]">
                <MenuLine width={20} />
                <MenuLine width={20} />
                <MenuLine width={15} short />
              </View>
            </Pressable>
          </View>

          {/* Figma node 323:335: the shop's token balance; opens
              Pengaturan Subscription. */}
          <Pressable
            onPress={() => router.push('/pengaturan-subscription')}
            accessibilityRole="button"
            accessibilityLabel={
              beta ? 'Token tersedia: tidak terbatas' : `Token tersedia: ${shop?.tokenBalance ?? 0} token`
            }
            className="w-full flex-row items-center justify-center gap-[10px] rounded-[12px] border border-dashed border-orange-200 bg-orange-50 py-[10px]">
            <View className="h-[27px] w-[28px] overflow-hidden">
              <Image
                source={require('@/assets/images/token-coin.png')}
                resizeMode="stretch"
                accessible={false}
                style={COIN_IMAGE}
              />
            </View>
            <View className="min-w-[84px]">
              <Text className="font-inter text-[12px] text-neutral-800">Token tersedia</Text>
              <Text className="font-inter-semibold text-[16px] text-neutral-800">
                {beta ? '∞ Tidak terbatas' : `${shop?.tokenBalance ?? 0} token`}
              </Text>
            </View>
          </Pressable>

          {/* Figma node 238:161. The card's fill is a still frame of the
            design's iridescent "Moving gradient" shader: running the shader
            itself proved too heavy on phones. The background color is the
            image's average, shown while it loads. The fill sits at 80% opacity;
            the text on top stays fully opaque. */}
          <View
            style={CARD_SHADOW}
            className="gap-[17px] overflow-hidden rounded-[12px] p-[20px]">
            <View style={CARD_FILL} className="bg-[#cdb8cc] opacity-80">
              <Image
                source={require('@/assets/images/dashboard-card-gradient.jpg')}
                resizeMode="cover"
                accessible={false}
                // Sized by style: left to its own devices the image takes the
                // file's pixel size and only a corner of it would show.
                style={CARD_FILL}
              />
            </View>
            <Text className="font-inter-bold text-[14px] text-neutral-800">Jastip bulan ini</Text>

            {/* The right-hand column is the same width in both rows, so
                Profit and Total order line up (Figma node 322:73 / 322:80). */}
            <View className="flex-row gap-[12px]">
              <View className="flex-1 gap-[6px]">
                <Text className="font-inter text-[12px] text-neutral-800">
                  Total Revenue (Bulan ini)
                </Text>
                <Text className="font-inter-bold text-[14px] text-neutral-800">
                  {formatIDR(totalRevenue)}
                </Text>
              </View>
              <View className="w-[110px] gap-[6px]">
                <Text className="font-inter text-[12px] text-neutral-800">Profit</Text>
                <Text className="font-inter-bold text-[14px] text-neutral-800">
                  {formatIDR(totalProfit)}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-[12px]">
              <View className="flex-1 gap-[8px]">
                <Text className="font-inter text-[12px] text-neutral-800">Sedang berlangsung</Text>
                <View
                  className={cn(
                    'max-w-[146px] self-start rounded-[12px] px-[10px] py-[2px]',
                    ongoingEvent ? 'bg-orange-400' : 'bg-white'
                  )}>
                  <Text
                    numberOfLines={1}
                    className={cn(
                      'font-inter-medium text-[12px] italic',
                      ongoingEvent ? 'text-neutral-50' : 'text-orange-500'
                    )}>
                    {ongoingEvent ? ongoingEvent.namaAcara : 'Belum ada'}
                  </Text>
                </View>
              </View>
              <View className="w-[110px] gap-[6px]">
                <Text className="font-inter text-[12px] text-neutral-800">Total order</Text>
                <Text className="font-inter-bold text-[14px] text-neutral-800">{totalOrder}</Text>
              </View>
            </View>
          </View>

          {/* Figma node 323:367, without the token cost under the label. */}
          <Link href="/buka-event-jastip" asChild>
            <Pressable
              style={BUTTON_SHADOW}
              className="w-full flex-row items-center justify-center gap-[10px] rounded-[12px] bg-orange-400 px-[10px] py-[16px]">
              <BasketIcon width={24} height={24} />
              <Text className="font-inter-semibold text-[14px] text-neutral-50">
                Buka event jastip
              </Text>
            </Pressable>
          </Link>

          {/* Figma node 241:35. */}
          {hasEvents ? (
            <View className="gap-[16px]">
              <Text className="font-inter-semibold text-[14px] text-neutral-800">
                List event jastip
              </Text>
              <View className="flex-row items-center gap-[10px] rounded-[8px] border border-[#d9d9d9] bg-white px-[10px]">
                <MagnifyingGlassIcon width={16} height={16} />
                <Input
                  value={query}
                  onChangeText={(value) => {
                    setQuery(value);
                    setPage(1);
                  }}
                  placeholder="Ketik nama event, lokasi atau kode event"
                  placeholderTextColor="#d1d5db"
                  accessibilityLabel="Cari event"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="h-auto min-h-[37px] min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none placeholder:text-neutral-400"
                />
              </View>
            </View>
          ) : null}
        </View>

        {hasEvents ? (
          <ScrollView
            ref={listRef}
            className="flex-1"
            contentContainerClassName="gap-[12px] px-[20px] pb-[40px]">
            {shownEvents.length === 0 ? (
              <Text className="font-inter text-[10px] italic text-neutral-800">
                Tidak ada event yang cocok
              </Text>
            ) : null}
            {pageEvents.map((event) => (
              // Figma node 323:403.
              <View
                key={event.id}
                className="gap-[10px] rounded-[12px] border border-dashed border-neutral-500 bg-orange-100 p-[16px]">
                <View className="flex-row items-start gap-[10px]">
                  <View className="flex-1 gap-[4px]">
                    <Text className="font-inter-semibold text-[14px] text-neutral-800">
                      {event.namaAcara}
                    </Text>
                    <Text className="font-inter text-[12px] text-neutral-800">{event.lokasi}</Text>
                    <Text className="font-inter text-[12px] text-neutral-800">
                      {formatDateRange(event.tanggalDari, event.tanggalSampai)}
                    </Text>
                  </View>
                  {/* A 44px rule drawn horizontally, turned upright. */}
                  <View className="h-[44px] w-0 items-center justify-center">
                    <View style={{ transform: [{ rotate: '90deg' }] }}>
                      <DividerVertical width={44} height={1} />
                    </View>
                  </View>
                  <View className="w-[89px] gap-[4px]">
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
                  <Pressable className="w-full items-center justify-center rounded-[8px] bg-orange-400 px-[10px] py-[6px]">
                    <Text className="font-inter-semibold text-[10px] text-neutral-50">
                      Lihat detail
                    </Text>
                  </Pressable>
                </Link>
              </View>
            ))}
            {/* Ten events to a page. */}
            {pageCount > 1 ? (
              <View className="items-center gap-[8px] pt-[8px]">
                <View className="flex-row flex-wrap items-center justify-center gap-[6px]">
                  <PageButton
                    label="‹"
                    accessibilityLabel="Halaman sebelumnya"
                    disabled={currentPage === 1}
                    onPress={() => goToPage(currentPage - 1)}
                  />
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                    <PageButton
                      key={number}
                      label={String(number)}
                      accessibilityLabel={`Halaman ${number}`}
                      active={number === currentPage}
                      onPress={() => goToPage(number)}
                    />
                  ))}
                  <PageButton
                    label="›"
                    accessibilityLabel="Halaman berikutnya"
                    disabled={currentPage === pageCount}
                    onPress={() => goToPage(currentPage + 1)}
                  />
                </View>
                <Text className="font-inter text-[10px] text-neutral-700">
                  Halaman {currentPage} dari {pageCount} · {shownEvents.length} event
                </Text>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </View>

      {menuOpen ? (
        <SideDrawer onClose={() => setMenuOpen(false)}>
          {(close) => (
            <View className="flex-1 items-end justify-between">
              <View className="w-full gap-[4px]">
                <View className="h-[84px] w-full items-end justify-start p-[4px]">
                  <Pressable onPress={() => close()} hitSlop={8}>
                    <XCircleIcon width={32} height={32} />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => close(() => router.push('/settings'))}
                  className="w-full items-start px-[10px] py-[10px]">
                  <Text className="font-inter-semibold text-[16px] text-white">
                    Pengaturan Akun
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => close(() => router.push('/pengaturan-subscription'))}
                  className="w-full items-start px-[10px] py-[10px]">
                  <Text className="font-inter-semibold text-[16px] text-white">
                    Pengaturan Subscription
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => close(() => router.push('/pengaturan-publikasi'))}
                  className="w-full items-start px-[10px] py-[10px]">
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
                  className="w-full items-start px-[10px] py-[10px]">
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

// One line of the menu icon. The SVG's stroke reaches 1px past its
// slot on every side, as in the design.
function MenuLine({ width, short = false }: { width: number; short?: boolean }) {
  const Line = short ? AlignLeftLineShort : AlignLeftLine;
  return (
    <View style={{ width: width - 2, height: 0 }}>
      <View style={{ position: 'absolute', left: -1, top: -1 }}>
        <Line width={width} height={2} />
      </View>
    </View>
  );
}

function PageButton({
  label,
  accessibilityLabel,
  active = false,
  disabled = false,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled }}
      className={cn(
        'h-[32px] min-w-[32px] items-center justify-center rounded-[8px] border px-[8px]',
        active ? 'border-orange-500 bg-orange-500' : 'border-neutral-400 bg-white',
        disabled && 'opacity-40'
      )}>
      <Text
        className={cn(
          'font-inter-semibold text-[12px]',
          active ? 'text-neutral-50' : 'text-neutral-800'
        )}>
        {label}
      </Text>
    </Pressable>
  );
}
