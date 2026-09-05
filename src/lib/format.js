import { SUI_TO_MYR, ASSETS } from '../data/mockData.js';
import { currency, fromMyr } from './currency.js';

/**
 * Format an amount of SUI.
 *
 * Precision follows magnitude, so a 0.005 network fee does not print as "0.00".
 *
 * Rounding is never to nearest: a balance rounds down (466.495 shown as 466.50
 * claims money you do not have) and a charge rounds up (25.005 shown as 25.00
 * makes the fee look free). Anything showing a cost passes `up`.
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

/** What a holding is worth in the selected currency. */
export const fiat = (n, asset = 'SUI') =>
  cash(Number(n) * (ASSETS[asset]?.myr ?? SUI_TO_MYR));

/**
 * A figure that is already money — a fee, a payout, a card charge. Everything
 * is priced in ringgit underneath; this converts it to the chosen currency.
 */
export function cash(myrAmount) {
  const c = currency();
  const body = fromMyr(myrAmount).toLocaleString('en-US', {
    minimumFractionDigits: c.dp,
    maximumFractionDigits: c.dp,
  });
  return `${c.symbol} ${body}`;
}

/** An amount in whichever asset holds it. Same rounding rules as `sui`. */
export function token(n, asset = 'SUI', opts = {}) {
  const body = sui(n, { ...opts, bare: true });
  return opts.bare ? body : `${body} ${ASSETS[asset]?.symbol ?? asset}`;
}

/** Ringgit back to SUI, for the on-ramp. */
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
