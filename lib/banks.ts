// Choices for a shop's bank account (components/bank-account-sheets.tsx).
// The name is stored as plain text, so anything not listed can be typed
// in with "Lainnya", e.g. a regional bank or one outside Indonesia.

export const BANKS = [
  'BCA',
  'Mandiri',
  'BRI',
  'BNI',
  'BSI (Bank Syariah Indonesia)',
  'CIMB Niaga',
  'Permata',
  'Danamon',
  'BTN',
  'OCBC',
  'Maybank',
  'Panin',
  'Bank Mega',
  'UOB',
  'Bank Jago',
  'SeaBank',
  'blu by BCA Digital',
  'Jenius',
  'Bank Neo Commerce',
  'Allo Bank',
  'Superbank',
  'Bank DKI',
  'Bank BJB',
];

// Customers often pay into these too; the "account number" is the
// phone number registered with the e-wallet.
export const E_WALLETS = ['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja'];

export function isListedBank(name: string) {
  return BANKS.includes(name) || E_WALLETS.includes(name);
}
