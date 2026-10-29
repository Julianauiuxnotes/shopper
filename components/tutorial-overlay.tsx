import { Text } from '@/components/ui/text';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Animated, Easing, Modal, Pressable, View, useWindowDimensions } from 'react-native';

// Not in Figma. A short walk through the Dashboard for new users, shown
// the first time (see app/dashboard.tsx) and again from the menu's
// "Tutorial" item. Each step darkens the screen except the part it talks
// about, which is outlined, with a card beside it. Moving between steps,
// the outline glides and resizes to the next part, the card slides along
// and its text fades in. Text is Indonesian, through t().

export type TutorialTarget = 'token' | 'summary' | 'bukaEvent' | 'menu';
type Rect = { x: number; y: number; width: number; height: number };

const STEPS: { target: TutorialTarget | null; title: string; body: string }[] = [
  {
    target: null,
    title: 'Selamat datang di Justipers!',
    body: 'Justipers membantumu mengelola jastip dari buka event, mencatat pesanan, sampai mengirim tagihan ke pelanggan. Yuk kenalan sebentar.',
  },
  {
    target: 'token',
    title: 'Token',
    body: 'Membuka event dan mempublikasikan form order masing-masing memakai 1 token. Akun baru dapat 5 token gratis. Tap kartu ini untuk melihat riwayat dan membeli token.',
  },
  {
    target: 'summary',
    title: 'Jastip bulan ini',
    body: 'Ringkasan revenue, profit, dan jumlah order dari event bulan ini, serta event yang sedang berlangsung.',
  },
  {
    target: 'bukaEvent',
    title: 'Buka event jastip',
    body: 'Mulai dari sini: isi nama acara, tanggal, dan lokasi. Di detail event kamu bisa membagikan link form order, menambah pesanan, mengirim tagihan ke WhatsApp customer, dan mengunduh laporan.',
  },
  {
    target: 'menu',
    title: 'Menu',
    body: 'Pengaturan akun, token dan anggota toko, publikasi, bahasa, dan tutorial ini ada di sini.',
  },
];

const DIM = 'rgba(0, 0, 0, 0.65)';
// Room left around the outlined part.
const PAD = 6;
const CARD_WIDTH = 330;
const GAP = 12;
// The outlined part's corner radius, and how far the dark layer reaches
// past it (more than any screen).
const RADIUS = 12;
const FRAME = 3000;
const MOVE = { duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false };

function TutorialOverlay({
  visible,
  targets,
  onClose,
}: {
  visible: boolean;
  /** The Dashboard parts each step points at. */
  targets: Record<TutorialTarget, React.RefObject<View | null>>;
  onClose: () => void;
}) {
  const t = useT();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [step, setStep] = React.useState(0);
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = React.useState(0);

  // The outlined hole and the card, animated between steps. A step with
  // nothing to outline is an empty hole in the middle of the screen, so the
  // next one grows out of it.
  const hole = React.useRef({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    width: new Animated.Value(0),
    height: new Animated.Value(0),
  }).current;
  const outline = React.useRef(new Animated.Value(0)).current;
  const cardLeft = React.useRef(new Animated.Value(0)).current;
  const cardTop = React.useRef(new Animated.Value(0)).current;
  const content = React.useRef(new Animated.Value(1)).current;
  // The whole tutorial fades in once it's placed, and out when it closes,
  // instead of cutting in over the Dashboard.
  const appear = React.useRef(new Animated.Value(0)).current;
  // The first position of each showing is jumped to, not animated.
  const placed = React.useRef(false);

  // Starts from the first step each time it opens.
  React.useEffect(() => {
    if (visible) setStep(0);
    else {
      placed.current = false;
      appear.setValue(0);
    }
  }, [visible, appear]);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  // Where the step's part is on screen; measured again when the window
  // changes size.
  React.useEffect(() => {
    if (!visible || !current.target) {
      setRect(null);
      return;
    }
    const node = targets[current.target].current;
    if (!node) {
      setRect(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      setRect({ x: x - PAD, y: y - PAD, width: width + PAD * 2, height: height + PAD * 2 });
    });
  }, [visible, current.target, targets, screenWidth, screenHeight]);

  const cardWidth = Math.min(CARD_WIDTH, screenWidth - 32);

  // Moves the hole and the card to this step's place: the card under the
  // outlined part when it fits, otherwise above it, and centred on screen
  // when nothing is outlined.
  React.useEffect(() => {
    if (!visible) return;
    const target = rect ?? {
      x: screenWidth / 2,
      y: screenHeight / 2,
      width: 0,
      height: 0,
    };
    let left: number;
    let top: number;
    if (rect) {
      const centre = rect.x + rect.width / 2;
      left = Math.min(Math.max(16, centre - cardWidth / 2), screenWidth - cardWidth - 16);
      const below = rect.y + rect.height + GAP;
      top =
        below + cardHeight <= screenHeight - 16 ? below : Math.max(16, rect.y - GAP - cardHeight);
    } else {
      left = (screenWidth - cardWidth) / 2;
      top = Math.max(16, (screenHeight - cardHeight) / 2);
    }
    const values: [Animated.Value, number][] = [
      [hole.x, target.x],
      [hole.y, target.y],
      [hole.width, target.width],
      [hole.height, target.height],
      [outline, rect ? 1 : 0],
      [cardLeft, left],
      [cardTop, top],
    ];
    if (!placed.current) {
      // Wait for the card's height, so it doesn't land and then jump.
      if (cardHeight === 0) return;
      values.forEach(([value, to]) => value.setValue(to));
      placed.current = true;
      // A short pause first lets the Dashboard finish arriving.
      Animated.timing(appear, {
        toValue: 1,
        duration: 300,
        delay: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return;
    }
    const animation = Animated.parallel(
      values.map(([value, to]) => Animated.timing(value, { toValue: to, ...MOVE }))
    );
    animation.start();
    return () => animation.stop();
  }, [
    visible,
    rect,
    cardHeight,
    cardWidth,
    screenWidth,
    screenHeight,
    hole,
    outline,
    cardLeft,
    cardTop,
    appear,
  ]);

  // The card's text fades in on each new step.
  React.useEffect(() => {
    content.setValue(0);
    Animated.timing(content, {
      toValue: 1,
      duration: 220,
      delay: 100,
      useNativeDriver: false,
    }).start();
  }, [step, content]);

  // Fades out, then closes (Lewati, Mulai, the back button).
  function close() {
    Animated.timing(appear, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => onClose());
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}>
      <Animated.View style={{ flex: 1, opacity: appear }}>
        {/* The dark layer: one huge frame whose border is the darkness and
            whose inside is the hole, so the hole gets rounded corners (a
            border's inner corner radius is its outer radius minus its
            width). */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: Animated.add(hole.x, -FRAME),
            top: Animated.add(hole.y, -FRAME),
            width: Animated.add(hole.width, FRAME * 2),
            height: Animated.add(hole.height, FRAME * 2),
            borderWidth: FRAME,
            borderColor: DIM,
            borderRadius: FRAME + RADIUS,
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: hole.x,
            top: hole.y,
            width: hole.width,
            height: hole.height,
            opacity: outline,
            borderRadius: RADIUS,
            borderWidth: 2,
            borderColor: '#ffffff',
          }}
        />

        {/* className doesn't reach Animated.View (NativeWind), so it only
            moves the card; the styled card is the View inside. */}
        <Animated.View
          accessibilityRole="alert"
          onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
          style={{ position: 'absolute', width: cardWidth, left: cardLeft, top: cardTop }}>
          <View className="gap-[12px] rounded-[12px] bg-white p-[16px]">
            <View className="flex-row items-center justify-between">
              <Text className="font-inter text-[10px] text-neutral-500">
                {t('Langkah {n} dari {total}', { n: step + 1, total: STEPS.length })}
              </Text>
              <Pressable onPress={close} accessibilityRole="button" hitSlop={8}>
                <Text className="font-inter-semibold text-[12px] text-neutral-500">
                  {t('Lewati')}
                </Text>
              </Pressable>
            </View>

            <Animated.View style={{ opacity: content, gap: 6 }}>
              <Text className="font-inter-bold text-[15px] text-neutral-900">
                {t(current.title)}
              </Text>
              <Text className="font-inter text-[12px] leading-[18px] text-neutral-700">
                {t(current.body)}
              </Text>
            </Animated.View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row gap-[6px]">
                {STEPS.map((_, index) => (
                  <View
                    key={index}
                    className={cn(
                      'h-[6px] rounded-full',
                      index === step ? 'w-[18px] bg-orange-500' : 'w-[6px] bg-orange-200'
                    )}
                  />
                ))}
              </View>
              <View className="flex-row gap-[8px]">
                {step > 0 ? (
                  <Pressable
                    onPress={() => setStep(step - 1)}
                    accessibilityRole="button"
                    className="items-center justify-center rounded-[8px] border border-neutral-800 bg-white px-[12px] py-[8px]">
                    <Text className="font-inter-semibold text-[12px] text-neutral-800">
                      {t('Kembali')}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => (last ? close() : setStep(step + 1))}
                  accessibilityRole="button"
                  className="items-center justify-center rounded-[8px] bg-orange-500 px-[12px] py-[8px]">
                  <Text className="font-inter-semibold text-[12px] text-white">
                    {last ? t('Mulai') : t('Lanjut')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export { TutorialOverlay };
