import { Text } from '@/components/ui/text';
import { type Language, useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Modal, Pressable, View } from 'react-native';

// Each language is named in itself, so it can be found whichever is on.
const LANGUAGES: { value: Language; name: string }[] = [
  { value: 'id', name: 'Bahasa Indonesia' },
  { value: 'en', name: 'English' },
];

// Not in Figma. The pop-up behind the Dashboard menu's "Bahasa / Language"
// item, styled like components/ui/confirm-dialog.tsx. Picking a language
// only selects it; "Terapkan" applies it and closes, "Batal" or a tap
// outside closes without changing anything. It's a setting of this
// device, not of the account (lib/i18n.tsx).
function LanguageDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { language, setLanguage, t } = useLanguage();
  const [choice, setChoice] = React.useState<Language>(language);

  // Starts from the current language each time the pop-up opens.
  React.useEffect(() => {
    if (visible) setChoice(language);
  }, [visible, language]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/50 p-[20px]">
        {/* No onPress: swallows taps on the card so only the backdrop closes. */}
        <Pressable className="w-full max-w-[330px] gap-[12px] rounded-[8px] bg-white p-[20px]">
          <Text className="font-inter-bold text-[14px] text-neutral-900">
            {t('Bahasa / Language')}
          </Text>
          <View accessibilityRole="radiogroup" className="gap-[8px]">
            {LANGUAGES.map((option) => {
              const selected = option.value === choice;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setChoice(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  className={cn(
                    'flex-row items-center gap-[10px] rounded-[8px] border p-[12px]',
                    selected ? 'border-orange-400 bg-orange-50' : 'border-neutral-400 bg-white'
                  )}>
                  <View
                    className={cn(
                      'h-[16px] w-[16px] items-center justify-center rounded-full border',
                      selected ? 'border-orange-500' : 'border-neutral-400'
                    )}>
                    {selected ? (
                      <View className="h-[8px] w-[8px] rounded-full bg-orange-500" />
                    ) : null}
                  </View>
                  <Text
                    className={cn(
                      'font-inter text-[13px]',
                      selected ? 'text-orange-500' : 'text-neutral-800'
                    )}>
                    {option.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="font-inter text-[10px] text-neutral-500">
            {t('Berlaku untuk aplikasi di perangkat ini.')}
          </Text>
          <View className="flex-row gap-[10px] pt-[4px]">
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              className="flex-1 items-center justify-center rounded-[8px] border border-neutral-800 bg-white p-[10px]">
              <Text className="font-inter-semibold text-[12px] text-neutral-800">{t('Batal')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setLanguage(choice);
                onClose();
              }}
              accessibilityRole="button"
              className="flex-1 items-center justify-center rounded-[8px] bg-orange-500 p-[10px]">
              <Text className="font-inter-semibold text-[12px] text-white">{t('Terapkan')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export { LanguageDialog };
