import CalendarIcon from '@/assets/images/figma/icon-calendar-dots.svg';
import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useEvents } from '@/lib/events-store';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { compressPhoto } from '@/lib/compress-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// Figma section BUKA EVENT JASTIP, node 53:2938 (empty) / 53:3015
// (filled) — a bottom sheet over the dimmed Dashboard, not a plain
// screen. Presented as a transparent modal sliding up from the bottom to
// match; the dim + sheet are rendered here since expo-router's own
// "transparentModal" presentation doesn't compose a backdrop for us.
export default function BukaEventJastipScreen() {
  const router = useRouter();
  const { addEvent } = useEvents();
  const [namaAcara, setNamaAcara] = React.useState('');
  const [tanggalDari, setTanggalDari] = React.useState<Date | undefined>();
  const [tanggalSampai, setTanggalSampai] = React.useState<Date | undefined>();
  const [lokasi, setLokasi] = React.useState('');
  const [activePicker, setActivePicker] = React.useState<'dari' | 'sampai' | null>(null);
  const [fotoUri, setFotoUri] = React.useState<string | null>(null);

  const isValid =
    namaAcara.trim().length > 0 && !!tanggalDari && !!tanggalSampai && lokasi.trim().length > 0;

  async function handlePickFoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin dibutuhkan', 'Aktifkan akses foto di pengaturan untuk memilih foto acara.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.mimeType && !ALLOWED_MIME_TYPES.includes(asset.mimeType)) {
      Alert.alert('Format tidak didukung', 'Pilih foto berformat JPG, JPEG, atau PNG.');
      return;
    }

    // Shrunk to ~200 KB before it's stored anywhere (lib/compress-image.ts).
    try {
      const compressed = await compressPhoto(asset);
      setFotoUri(compressed.uri);
    } catch {
      Alert.alert('Gagal', 'Foto tidak berhasil diproses. Coba pilih foto lain.');
    }
  }

  function handleSimpan() {
    if (!isValid || !tanggalDari || !tanggalSampai) return;
    // TODO: persist the event (and upload fotoUri, if set) via Supabase
    // once the backend (fymscirqwnnlubepymgc.supabase.co) is
    // unpaused/reconnected — for now it only lives in the in-memory
    // events store (lib/events-store.tsx), shared with Dashboard and
    // Event Detail so they all reflect the same data. A local file://
    // URI isn't meaningful data to persist without a real upload, so
    // fotoUri travels with the event object but nothing uploads it yet.
    const created = addEvent({ namaAcara, tanggalDari, tanggalSampai, lokasi, fotoUri });
    router.replace({ pathname: '/event-detail', params: { id: created.id } });
  }

  return (
    <>
      <Stack.Screen
        options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }}
      />
      <BottomSheet onClose={() => router.back()} sheetClassName="bg-orange-100">
        {(close) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1">
            <ScrollView
              contentContainerClassName="gap-[16px] px-[31px] pb-[32px] pt-[24.5px]"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Pressable onPress={close} hitSlop={8} className="flex-row items-center gap-[6px]">
                <CaretCircleLeftIcon width={24} height={24} />
                <Text className="font-inter-semibold text-[16px] text-black">Buka Jastip</Text>
              </Pressable>

              <View className="gap-[16px]">
                <View className="gap-[4px]">
                  <Text className="font-inter text-[12px] text-neutral-800">Nama Acara</Text>
                  <Input
                    value={namaAcara}
                    onChangeText={setNamaAcara}
                    placeholder="Nama acara"
                    placeholderTextColor="#9ca3af"
                    className="h-auto rounded-[8px] border-neutral-400 bg-white p-[10px] text-[12px] text-neutral-800 shadow-none"
                  />
                </View>

                <View className="gap-[10px]">
                  <Text className="font-inter-semibold text-[14px] text-neutral-800">
                    Tanggal Acara
                  </Text>
                  <View className="flex-row gap-[18px]">
                    <View className="w-[132px] gap-[4px]">
                      <Text className="font-inter text-[12px] text-neutral-800">Dari:</Text>
                      <Pressable
                        onPress={() => setActivePicker('dari')}
                        className="flex-row items-center gap-[10px] rounded-[8px] bg-white p-[10px]">
                        <CalendarIcon width={24} height={24} />
                        <Text
                          className={cn(
                            'flex-1 font-inter text-[12px]',
                            tanggalDari ? 'text-neutral-800' : 'text-neutral-400'
                          )}>
                          {formatDate(tanggalDari) || 'dd/mm/yyyy'}
                        </Text>
                      </Pressable>
                    </View>
                    <View className="w-[132px] gap-[4px]">
                      <Text className="font-inter text-[12px] text-neutral-800">Sampai:</Text>
                      <Pressable
                        onPress={() => setActivePicker('sampai')}
                        className="flex-row items-center gap-[10px] rounded-[8px] bg-white p-[10px]">
                        <CalendarIcon width={24} height={24} />
                        <Text
                          className={cn(
                            'flex-1 font-inter text-[12px]',
                            tanggalSampai ? 'text-neutral-800' : 'text-neutral-400'
                          )}>
                          {formatDate(tanggalSampai) || 'dd/mm/yyyy'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View className="gap-[4px]">
                  <Text className="font-inter text-[12px] text-neutral-800">Lokasi</Text>
                  <Input
                    value={lokasi}
                    onChangeText={setLokasi}
                    placeholder="Lokasi acara"
                    placeholderTextColor="#9ca3af"
                    className="h-auto rounded-[8px] border-neutral-400 bg-white p-[10px] text-[12px] text-neutral-800 shadow-none"
                  />
                </View>

                {fotoUri ? (
                  <View className="w-full gap-[8px]">
                    <Pressable
                      onPress={handlePickFoto}
                      className="h-[91px] w-full overflow-hidden rounded-[8px] border border-dashed border-neutral-400">
                      <Image
                        source={{ uri: fotoUri }}
                        resizeMode="cover"
                        className="h-full w-full"
                      />
                    </Pressable>
                    <Pressable
                      onPress={handlePickFoto}
                      className="h-[34px] w-[190px] items-center justify-center rounded-[8px] border border-orange-500">
                      <Text className="font-inter-semibold text-[14px] text-orange-500">
                        Ganti foto
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={handlePickFoto}
                    className="h-[91px] w-full items-center justify-center rounded-[8px] border border-dashed border-neutral-400 bg-white p-[10px]">
                    <Text className="font-inter text-[12px] text-neutral-400">
                      Foto acara (optional)
                    </Text>
                  </Pressable>
                )}
              </View>

              <Pressable
                onPress={handleSimpan}
                disabled={!isValid}
                accessibilityRole="button"
                accessibilityState={{ disabled: !isValid }}
                className={cn(
                  'w-full items-center justify-center rounded-[12px] px-[10px] py-[16px]',
                  isValid ? 'bg-orange-500' : 'bg-orange-200'
                )}>
                <Text
                  className={cn(
                    'font-inter-semibold text-[14px]',
                    isValid ? 'text-orange-50' : 'text-orange-300'
                  )}>
                  Simpan
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </BottomSheet>

      <Modal
        visible={activePicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-[24px]"
          onPress={() => setActivePicker(null)}>
          {/* Nested Pressable with no onPress-bubbling to the backdrop —
              React Native's responder system consumes the touch here,
              same pattern as the sheet-vs-backdrop above. */}
          <Pressable className="w-full max-w-[330px] rounded-[16px] bg-white">
            <Calendar
              value={activePicker === 'dari' ? tanggalDari : tanggalSampai}
              minDate={activePicker === 'sampai' ? tanggalDari : undefined}
              onSelect={(date) => {
                if (activePicker === 'dari') setTanggalDari(date);
                else setTanggalSampai(date);
                setActivePicker(null);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
