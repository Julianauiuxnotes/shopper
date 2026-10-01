import EyeIcon from '@/assets/images/figma/icon-eye.svg';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, type TextInput, View } from 'react-native';

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  onToggleSecure?: () => void;
  hasError?: boolean;
  errorMessage?: string;
  /** Sign Up's password-mismatch error also tints the input text red;
   * Login's error state (Figma node 53:2888) keeps the input text
   * neutral-800 and only reddens the border — set false to match that. */
  tintErrorText?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
};

// Shared by Sign Up (nodes 53:2811/53:2772/53:2738) and Login (nodes
// 49:878/53:2844/53:2888): white bg, 8px radius, neutral-400 border by
// default, 2px red-500 border on error, optional error message below.
export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  onToggleSecure,
  hasError,
  errorMessage,
  tintErrorText = true,
  keyboardType,
}: FormFieldProps) {
  return (
    <View className="w-full gap-1">
      <Text className="font-inter text-[12px] text-neutral-50">{label}</Text>
      <View
        className={cn(
          'w-full flex-row items-center gap-[10px] rounded-[8px] border bg-white px-[10px] py-[10px]',
          hasError ? 'border-2 border-red-500' : 'border-neutral-400'
        )}>
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          placeholderTextColor="#9ca3af"
          className={cn(
            'h-auto flex-1 border-0 bg-transparent p-0 text-[12px] shadow-none',
            hasError && tintErrorText ? 'text-red-500' : 'text-neutral-800'
          )}
        />
        {onToggleSecure ? (
          <Pressable onPress={onToggleSecure} hitSlop={8}>
            <EyeIcon width={13} height={13} />
          </Pressable>
        ) : null}
      </View>
      {errorMessage ? (
        <Text className="font-inter-semibold text-[10px] text-neutral-50">{errorMessage}</Text>
      ) : null}
    </View>
  );
}
