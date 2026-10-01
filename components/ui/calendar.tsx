import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, View } from 'react-native';

// A project-owned calendar component, following the same pattern as the
// other components/ui/* pieces (react-native-reusables) — neither shadcn
// (web-only) nor react-native-reusables ship a calendar/date-picker
// component, so this is hand-built rather than installed.
const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a?: Date, b?: Date) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type CalendarProps = {
  value?: Date;
  onSelect: (date: Date) => void;
  initialMonth?: Date;
  /** Dates before this (day-granularity) render disabled. */
  minDate?: Date;
};

function Calendar({ value, onSelect, initialMonth, minDate }: CalendarProps) {
  const [visibleMonth, setVisibleMonth] = React.useState(() => startOfMonth(initialMonth ?? value ?? new Date()));

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const minDay = minDate ? startOfDay(minDate) : undefined;
  const today = new Date();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View className="w-full gap-[12px] p-[16px]">
      <View className="flex-row items-center justify-between">
        <Pressable
          hitSlop={8}
          onPress={() => setVisibleMonth(new Date(year, month - 1, 1))}
          className="size-[32px] items-center justify-center rounded-full active:bg-orange-100">
          <Text className="font-inter-semibold text-[18px] text-neutral-800">‹</Text>
        </Pressable>
        <Text className="font-inter-semibold text-[14px] text-neutral-800">
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable
          hitSlop={8}
          onPress={() => setVisibleMonth(new Date(year, month + 1, 1))}
          className="size-[32px] items-center justify-center rounded-full active:bg-orange-100">
          <Text className="font-inter-semibold text-[18px] text-neutral-800">›</Text>
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEKDAYS.map((w) => (
          <View key={w} className="flex-1 items-center">
            <Text className="font-inter text-[10px] text-neutral-500">{w}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row">
          {week.map((date, di) => {
            if (!date) return <View key={di} className="aspect-square flex-1" />;
            const selected = isSameDay(date, value);
            const isToday = isSameDay(date, today);
            const disabled = !!minDay && date < minDay;
            return (
              <View key={di} className="aspect-square flex-1 items-center justify-center">
                <Pressable
                  disabled={disabled}
                  onPress={() => onSelect(date)}
                  className={cn(
                    'size-[32px] items-center justify-center rounded-full',
                    selected && 'bg-orange-500',
                    !selected && isToday && 'border border-orange-500'
                  )}>
                  <Text
                    className={cn(
                      'font-inter text-[12px]',
                      disabled ? 'text-neutral-300' : selected ? 'text-white' : 'text-neutral-800'
                    )}>
                    {date.getDate()}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export { Calendar };
