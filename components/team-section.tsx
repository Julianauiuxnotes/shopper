import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { AuthError, type Plan, useAuth } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, View } from 'react-native';

const PLANS: Array<{ value: Plan; label: string; description: string }> = [
  { value: 'solo', label: 'Solo', description: 'Satu orang, satu perangkat.' },
  { value: 'team', label: 'Team', description: 'Undang 1 anggota dan pakai form order customer.' },
];

// "Paket dan anggota" on Pengaturan: the shop's plan, who is in the shop,
// and (Team owner only) inviting one more person. No Figma design exists
// for this; it follows the rest of the settings screen.
//
// Who may do what, enforced again on the server
// (supabase/migrations/0002_shopper_accounts_and_shops.sql): anyone in
// the shop can change the plan (members can manage billing), but only the
// owner can invite or remove people.
//
// Prototype: there is no invitation email. The invited person signs up in
// Shopper with the invited address and lands in this shop.
function TeamSection() {
  const {
    shop,
    role,
    members,
    invites,
    userId,
    setPlan,
    inviteMember,
    cancelInvite,
    removeMember,
  } = useAuth();
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!shop) return null;
  const isOwner = role === 'owner';
  const seatsUsed = members.length + invites.length;

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Terjadi kesalahan. Coba lagi sebentar lagi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-[12px]">
      <Text className="font-inter-bold text-[14px] text-neutral-800">Paket dan anggota</Text>

      <View className="gap-[6px]">
        <Text className="font-inter-bold text-[12px] text-neutral-800">Paket (masa trial)</Text>
        <View className="flex-row gap-[8px]">
          {PLANS.map((option) => {
            const selected = shop.plan === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => !selected && run(() => setPlan(option.value))}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: busy }}
                className={cn(
                  'flex-1 gap-[2px] rounded-[8px] border p-[10px]',
                  selected ? 'border-orange-500 bg-orange-50' : 'border-neutral-400 bg-white'
                )}>
                <Text
                  className={cn(
                    'font-inter-bold text-[12px]',
                    selected ? 'text-orange-500' : 'text-neutral-800'
                  )}>
                  {option.label}
                </Text>
                <Text className="font-inter text-[10px] text-neutral-600">
                  {option.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-[6px]">
        <Text className="font-inter-bold text-[12px] text-neutral-800">Anggota toko</Text>
        {members.map((member) => (
          <View
            key={member.userId}
            className="flex-row items-center justify-between gap-[8px] rounded-[8px] border border-neutral-300 bg-white p-[10px]">
            <View className="flex-1 gap-[2px]">
              <Text className="font-inter-semibold text-[12px] text-neutral-800">
                {member.nama || member.email}
                {member.userId === userId ? ' (kamu)' : ''}
              </Text>
              <Text className="font-inter text-[10px] text-neutral-600">
                {member.email} · {member.role === 'owner' ? 'Pemilik' : 'Anggota'}
              </Text>
            </View>
            {isOwner && member.role === 'member' ? (
              <Pressable
                onPress={() => run(() => removeMember(member.userId))}
                accessibilityRole="button"
                accessibilityLabel={`Hapus anggota ${member.email}`}
                hitSlop={8}>
                <Text className="font-inter-semibold text-[12px] text-red-500 underline">
                  Hapus
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {invites.map((invite) => (
          <View
            key={invite.id}
            className="flex-row items-center justify-between gap-[8px] rounded-[8px] border border-dashed border-neutral-400 bg-neutral-50 p-[10px]">
            <View className="flex-1 gap-[2px]">
              <Text className="font-inter-semibold text-[12px] text-neutral-800">
                {invite.email}
              </Text>
              <Text className="font-inter text-[10px] text-neutral-600">
                Diundang, belum mendaftar
              </Text>
            </View>
            {isOwner ? (
              <Pressable
                onPress={() => run(() => cancelInvite(invite.id))}
                accessibilityRole="button"
                accessibilityLabel={`Batalkan undangan ${invite.email}`}
                hitSlop={8}>
                <Text className="font-inter-semibold text-[12px] text-red-500 underline">
                  Batalkan
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      {isOwner && shop.plan === 'team' && seatsUsed < 2 ? (
        <View className="gap-[6px]">
          <Text className="font-inter-bold text-[12px] text-neutral-800">Undang anggota</Text>
          <View className="flex-row items-center gap-[8px]">
            <View className="flex-1 rounded-[8px] border border-neutral-400 bg-white p-[10px]">
              <Input
                value={inviteEmail}
                onChangeText={(value) => {
                  setInviteEmail(value);
                  setError(null);
                }}
                placeholder="Email anggota"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                className="h-auto border-0 bg-transparent p-0 text-[12px] text-neutral-800 shadow-none"
              />
            </View>
            <Pressable
              onPress={() =>
                run(async () => {
                  await inviteMember(inviteEmail.trim());
                  setInviteEmail('');
                })
              }
              disabled={busy || inviteEmail.trim().length === 0}
              accessibilityRole="button"
              className={cn(
                'rounded-[8px] border p-[10px]',
                inviteEmail.trim().length > 0
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-orange-200 bg-white'
              )}>
              <Text
                className={cn(
                  'font-inter text-[12px]',
                  inviteEmail.trim().length > 0 ? 'text-orange-500' : 'text-orange-300'
                )}>
                Undang
              </Text>
            </Pressable>
          </View>
          <Text className="font-inter text-[10px] text-neutral-500">
            Belum ada email undangan otomatis. Minta anggota mendaftar di Shopper dengan email ini,
            dan ia akan langsung masuk ke toko kamu.
          </Text>
        </View>
      ) : null}

      {isOwner && shop.plan === 'solo' ? (
        <Text className="font-inter text-[10px] text-neutral-500">
          Pindah ke paket Team untuk mengundang anggota dan memakai form order customer.
        </Text>
      ) : null}
      {!isOwner ? (
        <Text className="font-inter text-[10px] text-neutral-500">
          Hanya pemilik toko yang bisa mengundang atau menghapus anggota.
        </Text>
      ) : null}

      {error ? <Text className="font-inter text-[10px] text-red-500">{error}</Text> : null}
    </View>
  );
}

export { TeamSection };
