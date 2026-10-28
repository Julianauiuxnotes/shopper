import BrandLogo from '@/assets/images/figma/justipers-logo.svg';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { AuthError, useAuth } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

// Figma section OPENING & SIGN UP, node 19:263 (empty) / 53:2671 (filled) /
// 53:2717 (error). The "List" menu icon (x=404 in a 390px frame) is
// off-canvas in the source design, so it's intentionally not rendered.
export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [nama, setNama] = React.useState('');
  const [namaJastip, setNamaJastip] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [verifikasi, setVerifikasi] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showVerifikasi, setShowVerifikasi] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  // Set when the server wants the email confirmed before the first login.
  const [awaitingConfirmation, setAwaitingConfirmation] = React.useState(false);

  const passwordMismatch = verifikasi.length > 0 && password !== verifikasi;
  const isValid =
    nama.trim().length > 0 &&
    namaJastip.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    verifikasi.length > 0 &&
    !passwordMismatch;

  // Creates the account and its shop (lib/auth-store.tsx). An email that
  // a shop has invited joins that shop instead, whatever shop name was
  // entered here. A new shop starts with 5 free tokens.
  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await signUp({
        nama: nama.trim(),
        namaJastip: namaJastip.trim(),
        email: email.trim(),
        password,
      });
      if (result === 'confirm_email') setAwaitingConfirmation(true);
      else router.replace('/dashboard');
    } catch (error) {
      setSubmitError(
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
      {/* Same header and panel as the login page (app/login.tsx). */}
      <View className="items-center gap-[13px] px-[10px] pt-[57px]">
        <BrandLogo width={161.78} height={56} />
        <Text className="text-center font-poppins text-[15px] text-neutral-900">
          Kelola jastip tanpa ribet!
        </Text>
      </View>

      {/* The card's content (5 fields + heading + 2 buttons) is often
          taller than the space below the header, so it needs to scroll —
          a plain View here clipped/overflowed content past the frame. */}
      <View className="mt-[54px] flex-1 overflow-hidden rounded-t-[110px] bg-orange-500">
        {/* The headings stay put; the rest of the panel scrolls
            underneath them. */}
        {!awaitingConfirmation ? (
          <View className="items-center px-[10px] pb-[14px] pt-[85px]">
            <View className="w-full max-w-[271px] gap-[14px]">
              <Text className="font-inter-bold text-[16px] text-neutral-50">Gabung Sekarang!</Text>
              <Text className="font-inter-bold text-[14px] text-neutral-50">Daftar akun baru</Text>
              <View className="w-full rounded-[8px] border border-neutral-50 px-[10px] py-[8px]">
                <Text className="font-inter text-[12px] text-neutral-50">
                  Akun baru dapat{' '}
                  <Text className="font-inter-bold text-[12px] text-neutral-50">5 token gratis</Text>{' '}
                  untuk mencoba Justipers.
                </Text>
              </View>
            </View>
          </View>
        ) : null}
        <ScrollView
          className="flex-1"
          contentContainerClassName={cn(
            'items-center px-[10px] pb-[32px]',
            awaitingConfirmation ? 'pt-[85px]' : 'pt-0'
          )}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-[271px] gap-[14px]">
            {awaitingConfirmation ? (
              <>
                <Text className="font-inter-bold text-[16px] text-neutral-50">Cek email kamu</Text>
                <Text className="font-inter text-[12px] text-neutral-50">
                  Kami mengirim link konfirmasi ke {email.trim()}. Buka link itu, lalu login untuk
                  mulai memakai Justipers.
                </Text>
                <Link href="/login" asChild>
                  <Pressable className="w-full items-center justify-center rounded-[12px] bg-neutral-50 px-[10px] py-[16px]">
                    <Text className="font-inter-semibold text-[14px] text-orange-500">Login</Text>
                  </Pressable>
                </Link>
              </>
            ) : (
              <>
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

                {submitError ? (
                  <Text className="w-full font-inter-semibold text-[10px] text-neutral-50">
                    {submitError}
                  </Text>
                ) : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={!isValid || submitting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !isValid || submitting, busy: submitting }}
                  className={cn(
                    'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                    isValid ? 'bg-neutral-50 shadow-md shadow-black/15' : 'bg-orange-600'
                  )}>
                  <Text
                    className={cn(
                      'font-inter-semibold text-[14px]',
                      isValid ? 'text-orange-500' : 'text-orange-700'
                    )}>
                    {submitting ? 'Memproses...' : 'Daftar'}
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
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
