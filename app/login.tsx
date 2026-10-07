import ShopperLogo from '@/assets/images/figma/shopper-logo.svg';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { ActiveElsewhereError, AuthError, useAuth } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';

// Figma section LOGIN, node 49:878 (empty) / 53:2844 (filled) / 53:2888
// (error). Logs in through lib/auth-store.tsx (Supabase Auth). Ticking
// "Tetap masuk" keeps the session when the app is closed; without it the
// next app open asks for the password again. Failures use Figma's error
// state, with the message for what actually went wrong (wrong
// credentials, unconfirmed email, no connection).
export default function LoginScreen() {
  const router = useRouter();
  const { signIn, notice } = useAuth();
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

  // True while the "account is active elsewhere" pop-up is open.
  const [confirmTakeOver, setConfirmTakeOver] = React.useState(false);

  // `takeOver`: the user agreed in the pop-up to log the other browser out.
  async function handleSubmit(takeOver = false) {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setLoginError(null);
    try {
      await signIn(email.trim(), password, keepLoggedIn, takeOver);
      setConfirmTakeOver(false);
      router.replace('/dashboard');
    } catch (error) {
      if (error instanceof ActiveElsewhereError) {
        setConfirmTakeOver(true);
        return;
      }
      setConfirmTakeOver(false);
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
                // `notice`: why this device was logged out, if it was.
                errorMessage={loginError ?? notice ?? undefined}
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
              onPress={() => handleSubmit()}
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

      {/* Asked when the account is active on another browser or device.
          Prototype: "Setuju" takes the account over straight away. The
          planned flow sends a confirmation email first and only switches
          once it is confirmed; that waits for an email service (domain). */}
      <Modal
        visible={confirmTakeOver}
        transparent
        // No fade: the pop-up must be gone the moment a choice is made,
        // not whenever an exit animation gets round to finishing.
        animationType="none"
        onRequestClose={() => setConfirmTakeOver(false)}>
        <View className="flex-1 items-center justify-center bg-black/50 p-[20px]">
          <View
            accessibilityRole="alert"
            className="w-full max-w-[330px] gap-[16px] rounded-[8px] bg-white p-[20px]">
            <Text className="font-inter text-[13px] leading-[20px] text-neutral-800">
              Akun ini sedang aktif di browser/perangkat lain. Apakah kamu mau keluar dari browser
              lain dan login di sini? Jika setuju, akunmu di browser lain akan secara otomatis
              keluar.
            </Text>
            <View className="flex-row gap-[10px]">
              <Pressable
                onPress={() => setConfirmTakeOver(false)}
                disabled={submitting}
                accessibilityRole="button"
                className="flex-1 items-center justify-center rounded-[8px] border border-orange-500 bg-white p-[10px]">
                <Text className="font-inter-semibold text-[12px] text-orange-500">
                  Tidak setuju
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleSubmit(true)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityState={{ busy: submitting }}
                className="flex-1 items-center justify-center rounded-[8px] bg-orange-500 p-[10px]">
                <Text className="font-inter-semibold text-[12px] text-white">
                  {submitting ? 'Memproses...' : 'Setuju'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
