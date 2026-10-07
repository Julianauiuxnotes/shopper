import ShopperLogo from '@/assets/images/figma/shopper-logo.svg';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { AuthError, type Plan, useAuth } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

const PLAN_OPTIONS: Array<{ value: Plan; label: string; description: string }> = [
  {
    value: 'solo',
    label: 'Solo',
    description: 'Untuk jastiper yang bekerja sendiri di satu perangkat.',
  },
  {
    value: 'team',
    label: 'Team',
    description: 'Untuk tim jastip: undang 1 anggota dan bagikan form order ke customer.',
  },
];

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
  // Which plan to trial. Nothing is pre-selected: the choice changes what
  // the account can do, so it should be made on purpose.
  const [plan, setPlan] = React.useState<Plan | null>(null);
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
    !passwordMismatch &&
    plan !== null;

  // Creates the account and its shop (lib/auth-store.tsx). An email that
  // a Team owner has invited joins that owner's shop instead, whatever
  // plan and shop name were entered here.
  async function handleSubmit() {
    if (!isValid || !plan || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await signUp({
        nama: nama.trim(),
        namaJastip: namaJastip.trim(),
        email: email.trim(),
        password,
        plan,
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
            {awaitingConfirmation ? (
              <>
                <Text className="font-inter-bold text-[16px] text-neutral-50">Cek email kamu</Text>
                <Text className="font-inter text-[12px] text-neutral-50">
                  Kami mengirim link konfirmasi ke {email.trim()}. Buka link itu, lalu login untuk
                  mulai memakai Shopper.
                </Text>
                <Link href="/login" asChild>
                  <Pressable className="w-full items-center justify-center rounded-[12px] bg-neutral-50 px-[10px] py-[16px]">
                    <Text className="font-inter-semibold text-[14px] text-orange-500">Login</Text>
                  </Pressable>
                </Link>
              </>
            ) : (
              <>
                <Text className="font-inter-bold text-[16px] text-neutral-50">
                  Gabung Sekarang!
                </Text>
                <Text className="font-inter-bold text-[14px] text-neutral-50">
                  Daftar akun baru
                </Text>

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

                {/* Not in Figma: the trial plan is chosen at registration. */}
                <View className="w-full gap-[6px]">
                  <Text className="font-inter-bold text-[10px] text-neutral-50">
                    Pilih paket trial
                  </Text>
                  {PLAN_OPTIONS.map((option) => {
                    const selected = plan === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setPlan(option.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        className={cn(
                          'w-full gap-[2px] rounded-[8px] border border-neutral-50 p-[10px]',
                          selected && 'bg-neutral-50'
                        )}>
                        <Text
                          className={cn(
                            'font-inter-bold text-[12px]',
                            selected ? 'text-orange-500' : 'text-neutral-50'
                          )}>
                          {option.label}
                        </Text>
                        <Text
                          className={cn(
                            'font-inter text-[10px]',
                            selected ? 'text-neutral-800' : 'text-neutral-50'
                          )}>
                          {option.description}
                        </Text>
                      </Pressable>
                    );
                  })}
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
