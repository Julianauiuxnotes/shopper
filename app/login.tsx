import ShopperLogo from '@/assets/images/figma/shopper-logo.svg';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { AuthError, useAuth } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

// Figma section LOGIN, node 49:878 (empty) / 53:2844 (filled) / 53:2888
// (error). Logs in through lib/auth-store.tsx (Supabase Auth). Ticking
// "Tetap masuk" keeps the session when the app is closed; without it the
// next app open asks for the password again. Failures use Figma's error
// state, with the message for what actually went wrong (wrong
// credentials, unconfirmed email, no connection).
export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  // The message to show under the fields; null when there is none.
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = React.useState(false);

  const isValid = email.trim().length > 0 && password.length > 0;

  function handleChangeEmail(value: string) {
    setEmail(value);
    setLoginError(null);
  }

  function handleChangePassword(value: string) {
    setPassword(value);
    setLoginError(null);
  }

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setLoginError(null);
    try {
      await signIn(email.trim(), password, keepLoggedIn);
      router.replace('/dashboard');
    } catch (error) {
      setLoginError(
        error instanceof AuthError ? error.message : 'Terjadi kesalahan. Coba lagi sebentar lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="items-center gap-[10px] px-[10px] pt-[60px]">
        <ShopperLogo width={220} height={35} />
        <Text className="text-center font-poppins text-[15px] text-neutral-900">
          Kelola jastip tanpa ribet!
        </Text>
      </View>

      {/* Same scroll-wrapped card pattern as sign-up.tsx — the error
          state's extra message line makes the card taller than the
          space below the header. */}
      <View className="mt-[64px] flex-1 overflow-hidden rounded-t-[32px] bg-orange-500">
        <ScrollView
          className="flex-1"
          contentContainerClassName="items-center px-[10px] pb-[32px] pt-[32px]"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-[271px] gap-[14px]">
            <Text className="font-inter-bold text-[16px] text-neutral-50">Selamat Datang!</Text>
            <Text className="font-inter-bold text-[14px] text-neutral-50">Login dengan akun</Text>

            <View className="w-full gap-[10px]">
              <FormField
                label="Email"
                value={email}
                onChangeText={handleChangeEmail}
                placeholder="Email"
                keyboardType="email-address"
                hasError={loginError !== null}
                tintErrorText={false}
              />
              <FormField
                label="Password"
                value={password}
                onChangeText={handleChangePassword}
                placeholder="Password"
                secureTextEntry={!showPassword}
                onToggleSecure={() => setShowPassword((s) => !s)}
                hasError={loginError !== null}
                tintErrorText={false}
                errorMessage={loginError ?? undefined}
              />
            </View>

            {/* Not in the Figma LOGIN section — styled to match the card's
                existing neutral-50-on-orange-500 treatment. */}
            <Pressable
              onPress={() => setKeepLoggedIn((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: keepLoggedIn }}
              hitSlop={8}
              className="flex-row items-center gap-[8px] self-start">
              <View
                className={cn(
                  'h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-neutral-50',
                  keepLoggedIn && 'bg-neutral-50'
                )}>
                {/* A text tick, not a lucide icon: importing one icon from
                    lucide-react-native bundles the whole library on web. */}
                {keepLoggedIn ? (
                  <Text className="font-inter-bold text-[12px] leading-[14px] text-orange-500">
                    ✓
                  </Text>
                ) : null}
              </View>
              <Text className="font-inter text-[12px] text-neutral-50">Tetap masuk</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={!isValid}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isValid }}
              className={cn(
                'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                isValid ? 'bg-orange-50' : 'bg-orange-600'
              )}>
              <Text
                className={cn(
                  'font-inter-semibold text-[14px]',
                  isValid ? 'text-orange-500' : 'text-orange-700'
                )}>
                {submitting ? 'Memproses...' : 'Login'}
              </Text>
            </Pressable>

            <Text className="w-full text-center font-inter text-[12px] text-neutral-50">
              Belum punya akun?
            </Text>

            <Link href="/sign-up" asChild>
              <Pressable className="w-full items-center justify-center rounded-[12px] border border-neutral-50 px-[10px] py-[16px]">
                <Text className="font-inter-semibold text-[14px] text-neutral-50">Daftar</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
