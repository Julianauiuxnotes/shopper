import CalendarIcon from '@/assets/images/figma/icon-calendar-dots.svg';
import CaretCircleLeftIcon from '@/assets/images/figma/icon-caret-circle-left.svg';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';

type TambahPengeluaranSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (input: { nama: string; tanggal: string; jumlah: number }) => void;
};

// Figma node 222:951 — the sheet that slides up from "+Tambah pengeluaran"
// on an event's Laporan tab. Simpan stays disabled until all three fields
// are filled.
export function TambahPengeluaranSheet({ visible, onClose, onSave }: TambahPengeluaranSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {visible ? <SheetForm onClose={onClose} onSave={onSave} /> : null}
    </Modal>
  );
}

// Mounted fresh each time the sheet opens, so the fields start empty.
function SheetForm({ onClose, onSave }: Omit<TambahPengeluaranSheetProps, 'visible'>) {
  const [nama, setNama] = React.useState('');
  const [tanggal, setTanggal] = React.useState<Date | undefined>();
  const [jumlah, setJumlah] = React.useState('');
  const [pickingDate, setPickingDate] = React.useState(false);
  const isValid = nama.trim().length > 0 && tanggal !== undefined && Number(jumlah) > 0;

  return (
    <>
      <BottomSheet onClose={onClose} sheetClassName="bg-orange-100">
        {(close) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1">
            <ScrollView
              contentContainerClassName="gap-[16px] px-[31px] pb-[32px] pt-[24px]"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Pressable
                onPress={close}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Tutup tambah pengeluaran"
                className="flex-row items-center gap-[6px]">
                <CaretCircleLeftIcon width={24} height={24} />
                <Text className="font-inter-semibold text-[16px] text-black">
                  Tambah pengeluaran
                </Text>
              </Pressable>

              <View className="gap-[16px]">
                <View className="gap-[4px]">
                  <Text className="font-inter text-[12px] text-neutral-800">
                    Deskripsi pengeluaran
                  </Text>
                  <Input
                    value={nama}
                    onChangeText={(value) => setNama(value.slice(0, 80))}
                    placeholder="Contoh: Bayar ojek online, ongkos ke venue"
                    placeholderTextColor="#d9d9d9"
                    accessibilityLabel="Deskripsi pengeluaran"
                    className="h-auto rounded-[8px] border-[#d9d9d9] bg-white p-[10px] text-[12px] text-neutral-800 shadow-none placeholder:text-[#d9d9d9]"
                  />
                </View>

                <View className="w-[132px] gap-[4px]">
                  <Text className="font-inter text-[12px] text-neutral-800">
                    Tanggal pengeluaran:
                  </Text>
                  <Pressable
                    onPress={() => setPickingDate(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Tanggal pengeluaran"
                    className="flex-row items-center gap-[10px] rounded-[8px] bg-white p-[10px]">
                    <CalendarIcon width={24} height={24} />
                    <Text
                      className={cn(
                        'flex-1 font-inter text-[12px]',
                        tanggal ? 'text-neutral-800' : 'text-[#d9d9d9]'
                      )}>
                      {formatDate(tanggal) || 'dd/mm/yyyy'}
                    </Text>
                  </Pressable>
                </View>

                <View className="gap-[4px]">
                  <Text className="font-inter text-[12px] text-neutral-800">
                    Jumlah pengeluaran
                  </Text>
                  <View className="min-h-[37px] flex-row items-center gap-[10px] rounded-[8px] border border-[#d9d9d9] bg-white px-[10px]">
                    <Text className="font-inter text-[12px] text-[#d9d9d9]">IDR</Text>
                    <Input
                      value={jumlah ? Number(jumlah).toLocaleString('id-ID') : ''}
                      onChangeText={(value) => setJumlah(value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="0"
                      placeholderTextColor="#2d3748"
                      keyboardType="number-pad"
                      accessibilityLabel="Jumlah pengeluaran"
                      className="h-auto min-h-[35px] min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none placeholder:text-neutral-800"
                    />
                  </View>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  if (!isValid || !tanggal) return;
                  // Saved right away, not when the slide-out finishes: the
                  // animation's callback doesn't fire in a background tab.
                  onSave({
                    nama: nama.trim(),
                    tanggal: tanggal.toISOString(),
                    jumlah: Number(jumlah),
                  });
                  close();
                }}
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
        visible={pickingDate}
        transparent
        animationType="fade"
        onRequestClose={() => setPickingDate(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-[24px]"
          onPress={() => setPickingDate(false)}>
          <Pressable className="w-full max-w-[330px] rounded-[16px] bg-white">
            <Calendar
              value={tanggal}
              onSelect={(date) => {
                setTanggal(date);
                setPickingDate(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
