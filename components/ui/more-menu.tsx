import DotsThreeCircleIcon from '@/assets/images/figma/icon-dots-three-circle.svg';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Modal, Pressable, View } from 'react-native';

type MoreMenuItem = {
  label: string;
  /** Shown in red, for actions that delete something. */
  destructive?: boolean;
  onPress: () => void;
};

const PANEL_WIDTH = 160;

// The "more" icon at the top right of a screen, with its drop-down menu.
// Destructive actions (Hapus event, Hapus pesanan) live in here rather
// than as buttons on the page, so they can't be tapped by accident.
//
// The panel is anchored under the icon: the Modal is only for stacking
// and tap-outside-to-close, and the panel is placed from the icon's
// measured position, like the Fee Jastip dropdown in tambah-pesanan.tsx.
function MoreMenu({ label, items }: { label: string; items: MoreMenuItem[] }) {
  const triggerRef = React.useRef<React.ElementRef<typeof Pressable> | null>(null);
  const [anchor, setAnchor] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  function open() {
    triggerRef.current?.measure((_fx, _fy, width, height, pageX, pageY) => {
      setAnchor({ x: pageX, y: pageY, width, height });
    });
  }

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}>
        <DotsThreeCircleIcon width={24} height={24} />
      </Pressable>

      <Modal
        visible={anchor !== null}
        transparent
        animationType="none"
        onRequestClose={() => setAnchor(null)}>
        <Pressable className="flex-1" onPress={() => setAnchor(null)}>
          {anchor ? (
            <View
              className="absolute rounded-[8px] border border-neutral-300 bg-white py-[4px] shadow-md shadow-black/15"
              style={{
                width: PANEL_WIDTH,
                top: anchor.y + anchor.height + 6,
                left: anchor.x + anchor.width - PANEL_WIDTH,
              }}>
              {items.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    setAnchor(null);
                    item.onPress();
                  }}
                  accessibilityRole="menuitem"
                  className="px-[12px] py-[10px]">
                  <Text
                    className={cn(
                      'font-inter-semibold text-[12px]',
                      item.destructive ? 'text-red-500' : 'text-neutral-800'
                    )}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

export { MoreMenu };
