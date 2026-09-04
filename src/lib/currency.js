/**
 * The currency the app counts in.
 *
 * Balances are held in SUI and USDT; this is only the money people think in
 * while they look at them. Ringgit is the default because that is where the
 * account lives, but a remittance app is used by someone whose family thinks
 * in taka or rupees, so the figure has to be able to change.
 *
 * Rates are demo figures pinned to the same dollar the stablecoin uses, so
 * every conversion in the product agrees with every other one.
 */

export const CURRENCIES = {
  MYR: { code: 'MYR', symbol: 'RM',  name: 'Malaysian ringgit',  perMyr: 1,      dp: 2 },
  USD: { code: 'USD', symbol: 'US$', name: 'US dollar',          perMyr: 0.2375, dp: 2 },
  SGD: { code: 'SGD', symbol: 'S$',  name: 'Singapore dollar',   perMyr: 0.3055, dp: 2 },
  BDT: { code: 'BDT', symbol: '৳',   name: 'Bangladeshi taka',   perMyr: 25.86,  dp: 2 },
  NPR: { code: 'NPR', symbol: 'रू',  name: 'Nepalese rupee',     perMyr: 31.72,  dp: 2 },
  INR: { code: 'INR', symbol: '₹',   name: 'Indian rupee',       perMyr: 19.84,  dp: 2 },
  IDR: { code: 'IDR', symbol: 'Rp',  name: 'Indonesian rupiah',  perMyr: 3712,   dp: 0 },
  PHP: { code: 'PHP', symbol: '₱',   name: 'Philippine peso',    perMyr: 13.42,  dp: 2 },
  EUR: { code: 'EUR', symbol: '€',   name: 'Euro',               perMyr: 0.2035, dp: 2 },
  GBP: { code: 'GBP', symbol: '£',   name: 'Pound sterling',     perMyr: 0.1755, dp: 2 },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE dirham',         perMyr: 0.8724, dp: 2 },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES);

export const DEFAULT_CURRENCY = 'MYR';
const STORAGE_KEY = 'mizan.currency';

/**
 * The active code is module state rather than a prop threaded through forty
 * components. Every formatter reads it; App owns the matching React state and
 * is the only thing that sets it, so a change re-renders the tree that reads
 * it. Set it anywhere else and the screen will not know to update.
 */
let active = DEFAULT_CURRENCY;

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && CURRENCIES[saved]) active = saved;
} catch {
  /* storage unavailable — the default stands */
}

export const getCurrency = () => active;
export const currency = () => CURRENCIES[active];

export function setCurrency(code) {
  if (!CURRENCIES[code]) return active;
  active = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* non-fatal: it holds for this session */
  }
  return active;
}

/** Ringgit in, the active currency out. */
export const fromMyr = (n, code = active) => (Number(n) || 0) * (CURRENCIES[code]?.perMyr ?? 1);

/** The active currency in, ringgit out — for anything priced in ringgit. */
export const toMyr = (n, code = active) => (Number(n) || 0) / (CURRENCIES[code]?.perMyr ?? 1);
