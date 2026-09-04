import { SUI_TO_MYR, ASSETS } from '../data/mockData.js';
import { currency, fromMyr } from './currency.js';

/**
 * Amounts are SUI. Small amounts — a network fee — need more places than a
 * balance does, so the precision follows the magnitude rather than being
 * fixed at two and printing "0.00" for a real fee.
 *
 * Rounding never goes to nearest, because "nearest" is wrong in both
 * directions here:
 *
 *   • a balance rounds DOWN — 466.495 shown as "466.50" reads as more money
 *     than you have
 *   • a cost rounds UP — a total of 25.005 shown as "25.00" reads as though
 *     the network fee were free
 *
 * So anything showing a charge passes `up`, and everything else gets the floor.
 */
export function sui(n, opts = {}) {
  const v = Number(n) || 0;
  const dp = opts.dp ?? (v !== 0 && Math.abs(v) < 1 ? 4 : 2);
  const scale = 10 ** dp;
  const scaled = v * scale;

  // The nudges absorb float error, so 25 * 100 does not ceil to 25.01.
  const settled = opts.up
    ? Math.ceil(scaled - 1e-9) / scale
    : Math.trunc(scaled + Number.EPSILON * Math.sign(v) * scale) / scale;

  const body = settled.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return opts.bare ? body : `${body} SUI`;
}

/** Just the digits, for places that set the unit in their own markup. */
export const suiNum = (n, opts = {}) => sui(n, { ...opts, bare: true });

/**
 * What a holding is worth, in whichever currency is selected. The asset says
 * which rate to price it at; SUI is the default.
 */
export const fiat = (n, asset = 'SUI') =>
  cash(Number(n) * (ASSETS[asset]?.myr ?? SUI_TO_MYR));

/**
 * A figure that is already money — a provider fee, a payout, a card charge.
 * Everything priced in the product is priced in ringgit underneath, and this
 * is where it becomes whatever the person chose to read it in.
 */
export function cash(myrAmount) {
  const c = currency();
  const body = fromMyr(myrAmount).toLocaleString('en-US', {
    minimumFractionDigits: c.dp,
    maximumFractionDigits: c.dp,
  });
  return `${c.symbol} ${body}`;
}

/**
 * An amount in whichever asset holds it. Same rounding rules as `sui` —
 * pass `{ up: true }` for anything that is a charge.
 */
export function token(n, asset = 'SUI', opts = {}) {
  const body = sui(n, { ...opts, bare: true });
  return opts.bare ? body : `${body} ${ASSETS[asset]?.symbol ?? asset}`;
}

/** Ringgit, back to SUI — the on-ramp works in the other direction. */
export const myrToSui = (rm) => (Number(rm) || 0) / SUI_TO_MYR;

export const pct = (n) =>
  `${n >= 0 ? '+' : '−'}${Math.abs(Number(n)).toFixed(2)}%`;

/** 0x1234…abcd */
export const shortAddr = (a, head = 6, tail = 4) =>
  !a ? '' : a.length <= head + tail + 2 ? a : `${a.slice(0, head)}…${a.slice(-tail)}`;

export const shortDigest = (d) => (!d ? '' : `${d.slice(0, 10)}…${d.slice(-6)}`);

export const explorerTx = (digest, network = 'testnet') =>
  `https://suiscan.xyz/${network}/tx/${digest}`;

export const explorerAddr = (address, network = 'testnet') =>
  `https://suiscan.xyz/${network}/account/${address}`;
