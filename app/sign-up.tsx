import BrandLogo from '@/assets/images/figma/justipers-logo.svg';
import { CountryPicker } from '@/components/country-picker';
import { LanguageSwitch } from '@/components/language-switch';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { AuthError, useAuth } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Link } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

// Figma section OPENING & SIGN UP, node 19:263 (empty) / 53:2671 (filled) /
// 53:2717 (error). The "List" menu icon (x=404 in a 390px frame) is
// off-canvas in the source design, so it's intentionally not rendered.
export default function SignUpScreen() {
  const { signUp } = useAuth();
  const t = useT();
  const [nama, setNama] = React.useState('');
  const [namaJastip, setNamaJastip] = React.useState('');
  const [country, setCountry] = React.useState('');
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
    country.length > 0 &&
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
        country,
        email: email.trim(),
        password,
      });
      // Otherwise signed in: components/auth-gate.tsx moves on to the
      // Dashboard (navigating here too opened it twice).
      if (result === 'confirm_email') setAwaitingConfirmation(true);
    } catch (error) {
      setSubmitError(
        error instanceof AuthError
          ? error.message
          : t('Terjadi kesalahan. Coba lagi sebentar lagi.')
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
        {/* Not in Figma: the language choice, top right. */}
        <LanguageSwitch className="absolute right-[16px] top-[16px]" />
        <BrandLogo width={161.78} height={56} />
        <Text className="text-center font-poppins text-[15px] text-neutral-900">
          {t('Kelola jastip tanpa ribet!')}
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
              <Text className="font-inter-bold text-[16px] text-neutral-50">
                {t('Gabung Sekarang!')}
              </Text>
              <Text className="font-inter-bold text-[14px] text-neutral-50">
                {t('Daftar akun baru')}
              </Text>
              <View className="w-full rounded-[8px] border border-neutral-50 px-[10px] py-[8px]">
                <Text className="font-inter text-[12px] text-neutral-50">
                  {t('Akun baru dapat')}{' '}
                  <Text className="font-inter-bold text-[12px] text-neutral-50">
                    {t('5 token gratis')}
                  </Text>{' '}
                  {t('untuk mencoba Justipers.')}
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
                <Text className="font-inter-bold text-[16px] text-neutral-50">
                  {t('Cek email kamu')}
                </Text>
                <Text className="font-inter text-[12px] text-neutral-50">
                  {t(
                    'Kami mengirim link konfirmasi ke {email}. Buka link itu, lalu login untuk mulai memakai Justipers.',
                    { email: email.trim() }
                  )}
                </Text>
                <Link href="/login" asChild>
                  <Pressable className="w-full items-center justify-center rounded-[12px] bg-neutral-50 px-[10px] py-[16px]">
                    <Text className="font-inter-semibold text-[14px] text-orange-500">
                      {t('Login')}
                    </Text>
                  </Pressable>
                </Link>
              </>
            ) : (
              <>
                <View className="w-full gap-[10px]">
                  <FormField
                    label={t('Nama')}
                    value={nama}
                    onChangeText={setNama}
                    placeholder={t('Nama Lengkap')}
                  />
                  <FormField
                    label={t('Nama Jastip')}
                    value={namaJastip}
                    onChangeText={setNamaJastip}
                    placeholder={t('Nama Jastip')}
                  />
                  <CountryPicker value={country} onChange={setCountry} />
                  <FormField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    keyboardType="email-address"
                  />
                  <FormField
                    label={t('Password')}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('Password')}
                    secureTextEntry={!showPassword}
                    onToggleSecure={() => setShowPassword((s) => !s)}
                  />
                  <FormField
                    label={t('Verifikasi Password')}
                    value={verifikasi}
                    onChangeText={setVerifikasi}
                    placeholder={t('Password')}
                    secureTextEntry={!showVerifikasi}
                    onToggleSecure={() => setShowVerifikasi((s) => !s)}
                    hasError={passwordMismatch}
                    errorMessage={passwordMismatch ? t("Password doesn't match!") : undefined}
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
                    {submitting ? t('Memproses...') : t('Daftar')}
                  </Text>
                </Pressable>

                <Text className="w-full text-center font-inter text-[12px] text-neutral-50">
                  {t('Sudah punya akun?')}
                </Text>

                <Link href="/login" asChild>
                  <Pressable className="w-full items-center justify-center rounded-[12px] border border-neutral-50 px-[10px] py-[16px]">
                    <Text className="font-inter-semibold text-[14px] text-neutral-50">
                      {t('Login')}
                    </Text>
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
