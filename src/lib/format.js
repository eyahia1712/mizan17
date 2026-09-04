import { SUI_TO_MYR } from '../data/mockData.js';

/**
 * Amounts are SUI. Small amounts — a network fee — need more places than a
 * balance does, so the precision follows the magnitude rather than being
 * fixed at two and printing "0.00" for a real fee.
 *
 * Rounding goes toward zero, not to nearest. A balance of 466.495 shown as
 * "466.50" is a balance that reads bigger than it is, and in a money interface
 * that is the one direction the rounding must never go.
 */
export function sui(n, opts = {}) {
  const v = Number(n) || 0;
  const dp = opts.dp ?? (v !== 0 && Math.abs(v) < 1 ? 4 : 2);
  const scale = 10 ** dp;
  const truncated = Math.trunc(v * scale + Number.EPSILON * Math.sign(v) * scale) / scale;
  const body = truncated.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return opts.bare ? body : `${body} SUI`;
}

/** Just the digits, for places that set the unit in their own markup. */
export const suiNum = (n, opts = {}) => sui(n, { ...opts, bare: true });

export const myr = (n) =>
  'RM ' + (Number(n) * SUI_TO_MYR).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
