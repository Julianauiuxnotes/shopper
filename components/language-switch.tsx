import { Text } from '@/components/ui/text';
import { type Language, useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Pressable, View } from 'react-native';

const OPTIONS: { value: Language; label: string; name: string }[] = [
  { value: 'id', label: 'ID', name: 'Bahasa Indonesia' },
  { value: 'en', label: 'EN', name: 'English' },
];

// Not in Figma. The "ID | EN" pill on the screens before login (splash,
// login, sign-up), so the language can be picked before there's an
// account. The Dashboard menu has the same choice (components/language-dialog.tsx).
export function LanguageSwitch({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  return (
    <View
      accessibilityRole="radiogroup"
      className={cn(
        'flex-row overflow-hidden rounded-full border border-neutral-300 bg-white',
        className
      )}>
      {OPTIONS.map((option) => {
        const selected = option.value === language;
        return (
          <Pressable
            key={option.value}
            onPress={() => setLanguage(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.name}
            accessibilityState={{ checked: selected }}
            hitSlop={4}
            className={cn('px-[10px] py-[4px]', selected && 'bg-orange-500')}>
            <Text
              className={cn(
                'font-inter-semibold text-[11px]',
                selected ? 'text-white' : 'text-neutral-600'
              )}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
