import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { AddMemberSheet, TeamSection } from '@/components/team-section';
import { BuyTokenSheet, TokenSection } from '@/components/token-section';
import { Text } from '@/components/ui/text';
import { useT } from '@/lib/i18n';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

// Tokens and shop members, reached from Dashboard's hamburger menu. No
// Figma design exists for this; the header follows Pengaturan Publikasi.
// The sheets are rendered here, outside the ScrollView, so they cover the
// whole screen on phones too.
export default function PengaturanSubscriptionScreen() {
  const router = useRouter();
  const t = useT();
  const [sheet, setSheet] = React.useState<'tokens' | 'member' | null>(null);

  return (
    <>
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-[20px] px-[20px] pb-[40px] pt-[20px]"
          keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="flex-row items-center gap-[5px]">
            <CaretCircleLeftIcon width={24} height={24} />
            <Text className="font-inter-bold text-[16px] text-[#5d5d5d]">
              {t('Pengaturan Subscription')}
            </Text>
          </Pressable>

          <TokenSection onBuyTokens={() => setSheet('tokens')} />
          <View className="h-px w-full bg-neutral-300" />
          <TeamSection onAddMember={() => setSheet('member')} />
        </ScrollView>
      </KeyboardAvoidingView>

      {sheet === 'tokens' ? <BuyTokenSheet onClose={() => setSheet(null)} /> : null}
      {sheet === 'member' ? <AddMemberSheet onClose={() => setSheet(null)} /> : null}
    </>
  );
}
