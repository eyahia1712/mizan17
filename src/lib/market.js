/**
 * Prices, quotes and routes.
 *
 * All the arithmetic behind buying, swapping and cashing out is here rather
 * than in the screens, so a quote on a review page is the same number the
 * transaction is built from.
 *
 * It mirrors how the real thing works:
 *
 *   Buying   A wallet does not sell you the coin. It shops the order to
 *            licensed on-ramp providers — each with its own spread and fee —
 *            and shows what each would deliver for the same cash.
 *
 *   Selling  There is no route from SUI straight to a bank account. SUI is
 *            swapped on chain for USDT, and an off-ramp converts the USDT to
 *            ringgit. Two steps and two fees, both of them shown.
 */

import { ASSETS, onrampProviders, NETWORK_FEE_SUI } from '../data/mockData.js';

/** Carry only the decimals the asset is displayed to. */
const toAssetPrecision = (n, asset) => round(n, ASSETS[asset]?.dp ?? 2);

export const rateMyr = (asset) => ASSETS[asset]?.myr ?? 0;

/** What one unit of `from` is worth in `to`. */
export const pairRate = (from, to) => rateMyr(from) / rateMyr(to);

const round = (n, dp = 6) => Math.round((Number(n) || 0) * 10 ** dp) / 10 ** dp;

/* ------------------------------ swap ----------------------------- */

/** The pool the demo routes through — Cetus is Sui's own DEX. */
export const SWAP_ROUTE = 'Cetus · SUI/USDT';

/** Taken by the pool, not by us. The standard 0.3% AMM fee. */
export const POOL_FEE_RATE = 0.003;

/** Default slippage tolerance, the figure most wallets ship with. */
export const DEFAULT_SLIPPAGE = 0.005;

/**
 * A swap quote. Price impact grows with the size of the order relative to the
 * pool, so a large swap gets a worse rate than a small one.
 */
export function swapQuote({ from = 'SUI', to = 'USDT', amount, slippage = DEFAULT_SLIPPAGE }) {
  const value = Number(amount) || 0;
  const rate = pairRate(from, to);

  const impact = Math.min(0.03, (value * rateMyr(from)) / 4_200_000);   // demo pool depth
  const poolFee = value * POOL_FEE_RATE;
  const out = (value - poolFee) * rate * (1 - impact);

  return {
    from, to, amount: value, rate,
    route: SWAP_ROUTE,
    poolFee: round(poolFee),
    priceImpact: impact,
    out: toAssetPrecision(out, to),
    minReceived: toAssetPrecision(out * (1 - slippage), to),
    slippage,
    networkFee: NETWORK_FEE_SUI,
  };
}

/* ------------------------------- buy ----------------------------- */

/**
 * One quote per provider for the same ringgit amount, best first. Each takes a
 * percentage fee and adds its own spread to the mid price, so the cheapest fee
 * is not always the most coin.
 */
export function buyQuotes({ myr, asset = 'SUI', providers = onrampProviders }) {
  const spend = Number(myr) || 0;
  const mid = rateMyr(asset);

  return providers
    .map((p) => {
      const fee = spend * p.feeRate;
      const price = mid * (1 + p.spread);            // what the provider charges per coin
      const receives = Math.max(0, (spend - fee) / price);
      return {
        ...p,
        spend,
        fee: round(fee, 2),
        price: round(price, 4),
        receives: toAssetPrecision(receives, asset),
        belowMinimum: spend > 0 && spend < p.minMyr,
      };
    })
    .sort((a, b) => b.receives - a.receives);
}

/* ---------------------------- cash out --------------------------- */

/** What the off-ramp takes turning USDT into ringgit. */
export const OFFRAMP_FEE_RATE = 0.009;

/** Flat processing charge on top, the way a payout partner bills it. */
export const OFFRAMP_FLAT_MYR = 2;

export function payoutQuote({ usdt, rail }) {
  const value = Number(usdt) || 0;
  const gross = value * rateMyr('USDT');
  const fee = gross * OFFRAMP_FEE_RATE + (value > 0 ? OFFRAMP_FLAT_MYR : 0);
  const net = Math.max(0, gross - fee);

  return {
    usdt: value,
    rate: rateMyr('USDT'),
    grossMyr: round(gross, 2),
    feeMyr: round(fee, 2),
    receiveMyr: round(net, 2),
    feeUsdt: round(fee / rateMyr('USDT'), 4),
    eta: rail?.eta ?? '1–2 business days',
    belowMinimum: rail ? net > 0 && net < rail.min : false,
    aboveMaximum: rail ? net > rail.max : false,
  };
}
