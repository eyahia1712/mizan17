/**
 * The ledger.
 *
 * Every figure the product shows is derived here from one list of
 * transactions: the month chart, the tiles, the wallet totals, the labels on
 * each row. Nothing is a hard-coded summary of something else, so a transfer
 * made in the app moves every number that depends on it at once.
 *
 * Amounts are SUI throughout.
 */

import { digestFor, NETWORK_FEE_SUI, SELL_FEE_RATE, BUY_FEE_RATE } from '../data/mockData.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const at = (ts) => (ts instanceof Date ? ts : new Date(ts));
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/* ------------------------------------------------------------------ */
/* Time                                                                */
/* ------------------------------------------------------------------ */

const clock = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** "Today, 09:12" · "Yesterday, 18:40" · "31 Aug, 20:05" · "7 Apr 2025, 08:05" */
export function whenLabel(ts, now = new Date()) {
  const d = at(ts);
  if (Number.isNaN(d.getTime())) return '';

  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return `Today, ${clock(d)}`;
  if (days === 1) return `Yesterday, ${clock(d)}`;

  const year = d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}, ${clock(d)}`;
}

export const monthKey = (ts) => {
  const d = at(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const monthLabel = (key) => MONTHS[Number(key.slice(5)) - 1];

/* ------------------------------------------------------------------ */
/* Aggregation                                                         */
/* ------------------------------------------------------------------ */

const amount = (t) => Number(t.sui) || 0;

/** A requested payment has not arrived. It is on the list, not in the totals. */
export const settled = (t) => !t.pending;

/**
 * What a transaction does to the balance.
 *   • incoming        credits the amount (a purchase fee is taken in ringgit)
 *   • a transfer out  costs the amount plus the network fee
 *   • a cash-out      costs the amount; its fee comes out of the proceeds
 */
export function balanceDelta(t) {
  if (t.pending) return 0;
  if (t.dir === 'in') return Number(t.sui) || 0;
  return -((Number(t.sui) || 0) + (t.kind === 'transfer' ? Number(t.fee) || 0 : 0));
}

/** Sent, received, fees and count over whatever slice you hand it. */
export function totals(items) {
  return items.filter(settled).reduce(
    (acc, t) => {
      if (t.dir === 'out') { acc.sent += amount(t); acc.out += 1; }
      else { acc.received += amount(t); acc.in += 1; }
      acc.fees += Number(t.fee) || 0;
      return acc;
    },
    { sent: 0, received: 0, fees: 0, out: 0, in: 0 }
  );
}

/**
 * The last `count` calendar months ending with the current one, each with its
 * own totals. Months with no activity still appear — a gap in the chart is
 * information, and dropping it would misdate every bar beside it.
 */
export function monthlySeries(items, count = 6, now = new Date()) {
  const buckets = new Map();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    buckets.set(key, { key, label: MONTHS[d.getMonth()], year: d.getFullYear(), items: [] });
  }

  for (const t of items) {
    const b = buckets.get(monthKey(t.ts));
    if (b) b.items.push(t);
  }

  return [...buckets.values()].map((b) => ({ ...b, ...totals(b.items) }));
}

/** Newest first. The lists are short; a copy keeps callers honest. */
export const byNewest = (items) => [...items].sort((a, b) => at(b.ts) - at(a.ts));

/* ------------------------------------------------------------------ */
/* Spending rules                                                      */
/* ------------------------------------------------------------------ */

export { NETWORK_FEE_SUI, SELL_FEE_RATE, BUY_FEE_RATE };

/**
 * What a transfer actually costs the balance. The fee is not optional and not
 * absorbed somewhere else, so it belongs in the number we check against.
 */
export const totalCost = (amountSui, fee = NETWORK_FEE_SUI) => (Number(amountSui) || 0) + fee;

/** The largest amount that can still be sent once the fee is paid. */
export const sendableFrom = (balance, fee = NETWORK_FEE_SUI) =>
  Math.max(0, round(balance - fee));

/**
 * Why an amount cannot be sent, or null when it can. Returning the reason
 * rather than a boolean is what lets the button explain itself.
 */
export function checkAmount(value, balance, fee = NETWORK_FEE_SUI) {
  const v = Number(value);
  if (!value) return null;                       // nothing typed yet is not an error
  if (!Number.isFinite(v) || v <= 0) return 'Enter an amount greater than zero.';
  if (v > balance) return `You only have ${round(balance)} SUI.`;
  if (totalCost(v, fee) > balance) {
    return `That leaves nothing for the ${fee} SUI network fee. Send at most ${sendableFrom(balance, fee)} SUI.`;
  }
  return null;
}

/** SUI has 9 decimals; carrying more than four is noise in a wallet. */
export const round = (n, dp = 4) => Math.round((Number(n) || 0) * 10 ** dp) / 10 ** dp;

/* ------------------------------------------------------------------ */
/* Writing to the ledger                                               */
/* ------------------------------------------------------------------ */

let seq = 0;

/**
 * One shape for every new entry, whoever created it.
 *
 * `pending` has to survive this call: it is what keeps a split request off the
 * balance and out of the totals until someone actually pays it.
 */
export function makeTx({
  dir, title, sui, kind = 'transfer', handle = null, method = null,
  fee, digest, real = false, ts, pending = false, toAddress = null,
}) {
  const id = `n${Date.now().toString(36)}-${seq++}`;
  return {
    id,
    dir,
    kind,
    title,
    sui: round(sui),
    ts: ts ?? new Date().toISOString(),
    handle,
    method,
    toAddress,
    fee: round(fee ?? (dir === 'out' ? NETWORK_FEE_SUI : 0)),
    digest: digest ?? digestFor(id),
    real,
    pending,
  };
}
