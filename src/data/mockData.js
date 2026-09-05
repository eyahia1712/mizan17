/**
 * All fixture data, kept in one file so the line between what is demonstrated
 * and what is real is easy to see. Everything here is made up. The one thing
 * that is not is a live-mode transfer — see src/lib/sui.js.
 *
 * Balances, transfers and fees are denominated in SUI; ringgit is only what
 * the money is worth on the way in and out.
 */

/** Demo market rates, in ringgit. */
export const SUI_TO_MYR = 14.86;
export const USDT_TO_MYR = 4.21;

/** Demo 24-hour price moves, for the wallet's market rows. */
export const SUI_CHANGE_24H = 2.41;
export const USDT_CHANGE_24H = 0.01;

/** Flat network fee charged per transfer. Real Sui gas is smaller than this. */
export const NETWORK_FEE_SUI = 0.005;

/** What the off-ramp takes converting USDT to ringgit. */
export const SELL_FEE_RATE = 0.009;

/** The assets this wallet holds, and what one unit is worth. */
export const ASSETS = {
  SUI:  { symbol: 'SUI',  name: 'Sui',        myr: SUI_TO_MYR,  dp: 2, change: SUI_CHANGE_24H },
  USDT: { symbol: 'USDT', name: 'Tether USD', myr: USDT_TO_MYR, dp: 2, change: USDT_CHANGE_24H },
};

export const user = {
  name: 'Eya Hia',
  email: 'demo@mizan.app',
  /** Opening balances. Nothing can be spent past them. */
  balanceSui: 486.5,
  balanceUsdt: 24.8,
};

/**
 * A stand-in for a Sui digest: base58-shaped and stable across reloads, so a
 * receipt opened twice shows the same reference.
 */
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function digestFor(seed) {
  let x = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    x ^= seed.charCodeAt(i);
    x = Math.imul(x, 16777619) >>> 0;
  }
  let out = '';
  for (let i = 0; i < 44; i++) {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;  x >>>= 0;
    out += B58[x % B58.length];
  }
  return out;
}

/** A stable 0x address, so a demo contact always has the same one. */
export function addressFor(seed) {
  let x = 2166136261;
  let out = '';
  for (let i = 0; i < 64; i++) {
    x ^= seed.charCodeAt(i % seed.length) + i;
    x = Math.imul(x, 16777619) >>> 0;
    x = (x ^ (x >>> 13)) >>> 0;
    out += (x % 16).toString(16);
  }
  return `0x${out}`;
}

export const contacts = [
  { id: 'c1', name: 'Ayesha',   handle: '+880 17 4432 8891', rel: 'Mother', address: addressFor('Ayesha') },
  { id: 'c2', name: 'Bilal',    handle: 'bilal@apu.edu.my',  rel: 'Housemate', address: addressFor('Bilal') },
  { id: 'c3', name: 'Nurul',    handle: '+60 12 887 4410',   rel: 'Housemate', address: addressFor('Nurul') },
  { id: 'c4', name: 'Prakash',  handle: '+977 98 4412 0087', rel: 'Cousin', address: addressFor('Prakash') },
  { id: 'c5', name: 'Landlord', handle: '+60 19 220 7781',   rel: 'Bukit Jalil', address: addressFor('Landlord') },
];

const handleFor = (name) => contacts.find((c) => c.name === name)?.handle;

/**
 * Six months of history. Every figure in the app — the month chart, the tiles,
 * the wallet totals — is computed from this list rather than stored twice.
 */
const SEED = [
  // September 2026 (current month)
  ['in',  'Ayesha',   '2026-09-04T09:12', 18.0,  'transfer'],
  ['out', 'Landlord', '2026-09-03T18:40', 32.5,  'transfer'],
  ['out', 'Bilal',    '2026-09-02T20:05', 4.2,   'transfer'],
  ['in',  'Nurul',    '2026-09-01T12:22', 6.4,   'transfer'],
  // August
  ['out', 'Prakash',  '2026-08-28T08:57', 12.0,  'transfer'],
  ['out', 'Landlord', '2026-08-25T10:15', 32.5,  'transfer'],
  ['in',  'Ayesha',   '2026-08-22T14:03', 24.0,  'transfer'],
  ['out', 'Bilal',    '2026-08-18T19:44', 3.8,   'transfer'],
  ['out', 'Nurul',    '2026-08-11T09:30', 5.6,   'transfer'],
  ['in',  'Card top-up', '2026-08-05T16:18', 40.0, 'topup'],
  // July
  ['out', 'Landlord', '2026-07-25T11:02', 32.5,  'transfer'],
  ['out', 'Prakash',  '2026-07-19T16:20', 20.0,  'transfer'],
  ['out', 'Cash out', '2026-07-15T09:41', 25.0,  'cashout'],
  ['out', 'Ayesha',   '2026-07-12T07:45', 22.0,  'transfer'],
  ['in',  'Bilal',    '2026-07-08T21:10', 9.5,   'transfer'],
  ['out', 'Nurul',    '2026-07-03T13:37', 6.0,   'transfer'],
  // June
  ['out', 'Landlord', '2026-06-25T10:48', 30.0,  'transfer'],
  ['out', 'Bilal',    '2026-06-16T18:12', 5.25,  'transfer'],
  ['in',  'Ayesha',   '2026-06-09T08:20', 15.0,  'transfer'],
  // May
  ['out', 'Landlord', '2026-05-26T09:55', 30.0,  'transfer'],
  ['out', 'Prakash',  '2026-05-20T12:41', 18.0,  'transfer'],
  ['out', 'Ayesha',   '2026-05-14T17:26', 14.0,  'transfer'],
  ['in',  'Nurul',    '2026-05-06T11:09', 7.2,   'transfer'],
  // April
  ['out', 'Landlord', '2026-04-24T10:33', 30.0,  'transfer'],
  ['out', 'Bilal',    '2026-04-15T20:50', 4.6,   'transfer'],
  ['out', 'Ayesha',   '2026-04-07T08:05', 8.0,   'transfer'],
];

const METHOD = {
  topup: 'Visa •••• 4291',
  cashout: "Touch 'n Go •••• 8891",
};

export const transactions = SEED.map(([dir, title, ts, amount, kind], i) => {
  const id = `t${i + 1}`;
  return {
    id,
    dir,
    kind,
    title,
    asset: 'SUI',
    amount,
    ts,
    handle: handleFor(title) ?? METHOD[kind] ?? null,
    method: METHOD[kind] ?? null,
    fee: dir === 'out' ? (kind === 'cashout' ? +(amount * SELL_FEE_RATE).toFixed(4) : NETWORK_FEE_SUI) : 0,
    digest: digestFor(id + ts),
  };
});

export const provisionSteps = [
  'Verifying account',
  'Creating your wallet',
  'Securing your keys',
  'Ready',
];

export const payoutMethods = [
  { id: 'p1', code: 'MY', name: 'Malaysian bank transfer', sub: 'Same day' },
  { id: 'p2', code: 'BD', name: 'Cash pickup',             sub: 'Under an hour' },
  { id: 'p3', code: 'NP', name: 'Mobile wallet',           sub: 'Instant' },
];

/* ------------- funding sources: on-ramp and off-ramp -------------- */

export const seedCards = [
  { id: 'k1', kind: 'card', brand: 'Visa',       last4: '4291', exp: '08/29', holder: 'EYA HIA' },
  { id: 'k2', kind: 'card', brand: 'Mastercard', last4: '7734', exp: '02/28', holder: 'EYA HIA' },
];

/**
 * Where ringgit lands. Touch 'n Go settles in minutes because it is an
 * e-wallet; a bank transfer takes days, and the flow says so.
 */
export const payoutRails = [
  {
    id: 'tng', kind: 'ewallet', brand: "Touch 'n Go eWallet", short: 'TNG',
    last4: '8891', sub: 'Linked to +60 12 887 4410',
    eta: 'Within minutes', etaShort: 'Minutes',
    min: 10, max: 5000,
  },
  {
    id: 'cimb', kind: 'bank', brand: 'CIMB Bank', short: 'CIMB',
    last4: '9820', sub: 'Current account · Malaysia',
    eta: '1–2 business days', etaShort: '1–2 days',
    min: 50, max: 50000,
  },
];

/** Ways to pay on the way in. A Malaysian on-ramp takes all three. */
export const buyRails = [
  ...seedCards.map((c) => ({ ...c, sub: `Expires ${c.exp}`, eta: 'Instant' })),
  { id: 'tng-in',  kind: 'ewallet', brand: "Touch 'n Go eWallet", short: 'TNG',  last4: '8891', sub: 'Linked to +60 12 887 4410', eta: 'Instant' },
  { id: 'fpx-in',  kind: 'bank',    brand: 'CIMB Bank',           short: 'CIMB', last4: '9820', sub: 'FPX online banking',        eta: 'Within an hour' },
];

/**
 * On-ramp providers. A wallet does not sell you the coin itself — it shops the
 * order to licensed providers, and they differ on both fee and spread, which is
 * what the comparison screen is for.
 */
export const onrampProviders = [
  { id: 'moonpay', name: 'MoonPay', feeRate: 0.0149, spread: 0.006, minMyr: 50,  eta: '2–5 minutes',  kyc: 'verified' },
  { id: 'transak', name: 'Transak', feeRate: 0.0099, spread: 0.010, minMyr: 60,  eta: '5–10 minutes', kyc: 'verified' },
  { id: 'banxa',   name: 'Banxa',   feeRate: 0.0199, spread: 0.004, minMyr: 100, eta: 'Under a minute', kyc: 'required' },
];
