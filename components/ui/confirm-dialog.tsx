import { Text } from '@/components/ui/text';
import * as React from 'react';
import { Modal, Pressable, View } from 'react-native';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// A yes/no pop-up for actions that can't be undone. `Alert.alert` isn't
// used because it does nothing on web (react-native-web's Alert is a
// no-op). No fade, so it is gone the moment a choice is made. The confirm
// button is red: every use so far is a deletion.
function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/50 p-[20px]">
        <View
          accessibilityRole="alert"
          className="w-full max-w-[330px] gap-[12px] rounded-[8px] bg-white p-[20px]">
          <Text className="font-inter-bold text-[14px] text-neutral-900">{title}</Text>
          <Text className="font-inter text-[13px] leading-[20px] text-neutral-800">{message}</Text>
          <View className="flex-row gap-[10px] pt-[4px]">
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              className="flex-1 items-center justify-center rounded-[8px] border border-neutral-800 bg-white p-[10px]">
              <Text className="font-inter-semibold text-[12px] text-neutral-800">
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              className="flex-1 items-center justify-center rounded-[8px] bg-red-500 p-[10px]">
              <Text className="font-inter-semibold text-[12px] text-white">{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export { ConfirmDialog };
