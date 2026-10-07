import ShopperLogo from '@/assets/images/figma/shopper-logo.svg';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { useEvents } from '@/lib/events-store';
import { useSettings } from '@/lib/settings-store';
import { cn } from '@/lib/utils';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

// Figma section OPENING & SIGN UP, node 19:263 (empty) / 53:2671 (filled) /
// 53:2717 (error). The "List" menu icon (x=404 in a 390px frame) is
// off-canvas in the source design, so it's intentionally not rendered.
export default function SignUpScreen() {
  const router = useRouter();
  const { setUserProfile, resetBusinessSettings } = useSettings();
  const { resetEvents } = useEvents();
  const [nama, setNama] = React.useState('');
  const [namaJastip, setNamaJastip] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [verifikasi, setVerifikasi] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showVerifikasi, setShowVerifikasi] = React.useState(false);

  const passwordMismatch = verifikasi.length > 0 && password !== verifikasi;
  const isValid =
    nama.trim().length > 0 &&
    namaJastip.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    verifikasi.length > 0 &&
    !passwordMismatch;

  function handleSubmit() {
    if (!isValid) return;
    // TODO: wire to Supabase auth signup once the DoReMi/Shopper project
    // (fymscirqwnnlubepymgc.supabase.co) is unpaused and reconnected. Until
    // then, persist to the local settings store so Pengaturan has real
    // data to show/edit.
    // A new account starts empty. Events, orders and business settings
    // are stored per device rather than per account (no backend yet), and
    // signing up replaces the device's one local account — so anything
    // left over from the previous account or from testing is cleared here
    // instead of showing up on the new user's dashboard.
    resetEvents();
    resetBusinessSettings();
    setUserProfile({
      nama: nama.trim(),
      namaJastip: namaJastip.trim(),
      email: email.trim(),
      password,
    });
    // Goes straight to Dashboard rather than /login: there's no real
    // backend auth to log into yet (/login is still a placeholder stub
    // with no onward navigation), so sending a just-signed-up user to a
    // dead end would force a hard page reload to reach anything else —
    // which wipes this in-memory store before Pengaturan ever gets to
    // show the data just entered here.
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

      {/* The card's content (5 fields + heading + 2 buttons) is often
          taller than the space below the header, so it needs to scroll —
          a plain View here clipped/overflowed content past the frame. */}
      <View className="mt-[64px] flex-1 overflow-hidden rounded-t-[32px] bg-orange-500">
        <ScrollView
          className="flex-1"
          contentContainerClassName="items-center px-[10px] pb-[32px] pt-[32px]"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-[271px] gap-[14px]">
            <Text className="font-inter-bold text-[16px] text-neutral-50">Gabung Sekarang!</Text>
            <Text className="font-inter-bold text-[14px] text-neutral-50">Daftar akun baru</Text>

            <View className="w-full gap-[10px]">
              <FormField
                label="Nama"
                value={nama}
                onChangeText={setNama}
                placeholder="Nama Lengkap"
              />
              <FormField
                label="Nama Jastip"
                value={namaJastip}
                onChangeText={setNamaJastip}
                placeholder="Nama Jastip"
              />
              <FormField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
              />
              <FormField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={!showPassword}
                onToggleSecure={() => setShowPassword((s) => !s)}
              />
              <FormField
                label="Verifikasi Password"
                value={verifikasi}
                onChangeText={setVerifikasi}
                placeholder="Password"
                secureTextEntry={!showVerifikasi}
                onToggleSecure={() => setShowVerifikasi((s) => !s)}
                hasError={passwordMismatch}
                errorMessage={passwordMismatch ? "Password doesn't match!" : undefined}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={!isValid}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isValid }}
              className={cn(
                'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                isValid ? 'bg-neutral-50 shadow-md shadow-black/15' : 'bg-orange-600'
              )}>
              <Text
                className={cn(
                  'font-inter-semibold text-[14px]',
                  isValid ? 'text-orange-500' : 'text-orange-700'
                )}>
                Daftar
              </Text>
            </Pressable>

            <Text className="w-full text-center font-inter text-[12px] text-neutral-50">
              Sudah punya akun?
            </Text>

            <Link href="/login" asChild>
              <Pressable className="w-full items-center justify-center rounded-[12px] border border-neutral-50 px-[10px] py-[16px]">
                <Text className="font-inter-semibold text-[14px] text-neutral-50">Login</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
