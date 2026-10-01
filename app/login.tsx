import ShopperLogo from '@/assets/images/figma/shopper-logo.svg';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { useSettings } from '@/lib/settings-store';
import { cn } from '@/lib/utils';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

// Figma section LOGIN, node 49:878 (empty) / 53:2844 (filled) / 53:2888
// (error). No real backend auth exists yet (see sign-up.tsx's TODO) —
// "login" here checks the entered email/password against whatever
// profile is currently held in lib/settings-store's userProfile
// (written by Sign Up), which only works within the same browser/app
// session since that store is in-memory only and resets on reload.
// Wrong credentials show the exact error state from Figma ("Email atau
// password salah. Coba lagi.") rather than silently failing or always
// succeeding.
export default function LoginScreen() {
  const router = useRouter();
  const { userProfile } = useSettings();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loginError, setLoginError] = React.useState(false);

  const isValid = email.trim().length > 0 && password.length > 0;

  function handleChangeEmail(value: string) {
    setEmail(value);
    setLoginError(false);
  }

  function handleChangePassword(value: string) {
    setPassword(value);
    setLoginError(false);
  }

  function handleSubmit() {
    if (!isValid) return;
    const matches =
      userProfile.email.length > 0 &&
      email.trim().toLowerCase() === userProfile.email.toLowerCase() &&
      password === userProfile.password;
    if (!matches) {
      setLoginError(true);
      return;
    }
    router.replace('/dashboard');
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
                hasError={loginError}
                tintErrorText={false}
              />
              <FormField
                label="Password"
                value={password}
                onChangeText={handleChangePassword}
                placeholder="Password"
                secureTextEntry={!showPassword}
                onToggleSecure={() => setShowPassword((s) => !s)}
                hasError={loginError}
                tintErrorText={false}
                errorMessage={loginError ? 'Email atau password salah. Coba lagi.' : undefined}
              />
            </View>

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
                Login
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
