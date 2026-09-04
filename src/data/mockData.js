/**
 * Demo dataset. Everything here is fabricated so the product runs without a
 * server. The one thing that is NOT fabricated is the Sui transaction in live
 * mode — see src/lib/sui.js.
 *
 * The unit of account is SUI. There is no dollar anywhere in this product:
 * balances, transfers, fees and history are all denominated in SUI, and the
 * only second currency is the ringgit the money lands in.
 */

/** Demo market rate. One SUI, in ringgit. */
export const SUI_TO_MYR = 14.86;

/** Demo 24-hour move, for the wallet's market row. */
export const SUI_CHANGE_24H = 2.41;

/** Sui gas is a rounding error. This is the flat network fee we charge. */
export const NETWORK_FEE_SUI = 0.005;

/** What the on-ramp and off-ramp take, as a fraction. */
export const BUY_FEE_RATE = 0.01;
export const SELL_FEE_RATE = 0.009;

export const user = {
  name: 'Eya Hia',
  email: 'demo@mizan.app',
  /** The opening balance, in SUI. Nothing may be spent past it. */
  balanceSui: 486.5,
};

/**
 * Deterministic stand-in for a Sui digest: base58-shaped, stable across
 * reloads, so a receipt opened twice shows the same reference.
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

/** A deterministic 0x-address, so a demo contact always has the same one. */
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
 * Six months of history, with real timestamps. Every figure the app shows —
 * the month chart, the tiles, the wallet's totals — is computed from this
 * list. Nothing is hard-coded twice.
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
  cashout: 'Maybank •••• 4417',
};

export const transactions = SEED.map(([dir, title, ts, sui, kind], i) => {
  const id = `t${i + 1}`;
  return {
    id,
    dir,
    kind,
    title,
    sui,
    ts,
    handle: handleFor(title) ?? METHOD[kind] ?? null,
    method: METHOD[kind] ?? null,
    fee: dir === 'out' ? (kind === 'cashout' ? +(sui * SELL_FEE_RATE).toFixed(4) : NETWORK_FEE_SUI) : 0,
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

/* ------------------------------------------------------------------ */
/* Funding sources — the wallet's on-ramp and off-ramp                  */
/* ------------------------------------------------------------------ */

export const seedCards = [
  { id: 'k1', kind: 'card', brand: 'Visa',       last4: '4291', exp: '08/29', holder: 'EYA HIA' },
  { id: 'k2', kind: 'card', brand: 'Mastercard', last4: '7734', exp: '02/28', holder: 'EYA HIA' },
];

export const seedBanks = [
  { id: 'b1', kind: 'bank', brand: 'Maybank',   last4: '4417', sub: 'Savings · Malaysia' },
  { id: 'b2', kind: 'bank', brand: 'CIMB Bank', last4: '9820', sub: 'Current · Malaysia' },
];
