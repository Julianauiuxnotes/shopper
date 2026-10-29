import MagnifyingGlassIcon from '@/assets/images/figma/icon-magnifying-glass.svg';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { countryFlag, countryList, countryName } from '@/lib/countries';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';

// Not in Figma. Sign-up's "Negara" field: looks like the other fields on
// the orange panel (components/ui/form-field.tsx) and opens a searchable
// list of every country (lib/countries.ts), named in the app's language.
export function CountryPicker({
  value,
  onChange,
}: {
  /** Two-letter country code, or '' when none is picked yet. */
  value: string;
  onChange: (code: string) => void;
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  // Re-sorted when the language changes, since the names change.
  const countries = React.useMemo(() => countryList(), [language]);
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? countries.filter(
        (c) => c.name.toLowerCase().includes(needle) || c.code.toLowerCase() === needle
      )
    : countries;

  function close() {
    setOpen(false);
    setQuery('');
  }

  return (
    <View className="w-full gap-1">
      <Text className="font-inter text-[12px] text-neutral-50">{t('Negara')}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={value ? `${t('Negara')}: ${countryName(value)}` : t('Pilih negara')}
        className="h-[61px] w-full flex-row items-center gap-[8px] rounded-[8px] border border-neutral-400 bg-white px-[10px] sm:h-[57px]">
        {value ? <Text className="text-[14px]">{countryFlag(value)}</Text> : null}
        <Text
          numberOfLines={1}
          className={cn('flex-1 text-[12px]', value ? 'text-neutral-800' : 'text-[#9ca3af]')}>
          {value ? countryName(value) : t('Pilih negara')}
        </Text>
        <Text className="text-[10px] text-neutral-500">▼</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={close}>
        <Pressable
          onPress={close}
          className="flex-1 items-center justify-center bg-black/50 p-[20px]">
          {/* No onPress: swallows taps on the card so only the backdrop closes. */}
          <Pressable className="h-[70%] w-full max-w-[360px] gap-[12px] rounded-[8px] bg-white p-[16px]">
            <View className="flex-row items-center justify-between">
              <Text className="font-inter-bold text-[14px] text-neutral-900">
                {t('Pilih negara')}
              </Text>
              <Pressable onPress={close} accessibilityRole="button" hitSlop={8}>
                <Text className="font-inter-semibold text-[12px] text-neutral-500">
                  {t('Tutup')}
                </Text>
              </Pressable>
            </View>
            {/* 44px tall, the usual touch height for a search bar. */}
            <View className="h-[44px] flex-row items-center gap-[8px] rounded-[8px] border border-neutral-400 bg-white px-[12px]">
              <MagnifyingGlassIcon width={16} height={16} />
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder={t('Cari negara')}
                placeholderTextColor="#9ca3af"
                autoCorrect={false}
                className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] text-neutral-800 shadow-none"
              />
            </View>
            <FlatList
              data={shown}
              keyExtractor={(c) => c.code}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text className="py-[12px] text-center font-inter text-[12px] text-neutral-500">
                  {t('Negara tidak ditemukan')}
                </Text>
              }
              renderItem={({ item }) => {
                const selected = item.code === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.code);
                      close();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={cn(
                      'flex-row items-center gap-[10px] rounded-[6px] px-[8px] py-[10px]',
                      selected && 'bg-orange-50'
                    )}>
                    <Text className="text-[16px]">{countryFlag(item.code)}</Text>
                    <Text
                      className={cn(
                        'flex-1 font-inter text-[13px]',
                        selected ? 'text-orange-500' : 'text-neutral-800'
                      )}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
