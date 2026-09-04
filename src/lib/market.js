/**
 * Prices, quotes and routes.
 *
 * The arithmetic behind buying, swapping and cashing out lives here rather
 * than inside the screens, so a quote shown on a review page is the same
 * number the transaction is built from — computed once, in one place.
 *
 * How the real thing works, and what this mirrors:
 *
 *   Buying   A wallet does not sell you the coin. It shops your order to
 *            licensed on-ramp providers, each with its own spread and fee,
 *            and shows what each would deliver. You pick one, pay it in
 *            ringgit, and it sends the coin to your address.
 *
 *   Selling  There is no route from SUI straight to a bank account. SUI is first
 *            swapped on chain for a stablecoin — USDT — and the stablecoin is
 *            what an off-ramp converts to ringgit and pays out. Two steps,
 *            two fees, and this app shows both instead of pretending it is one.
 */

import { ASSETS, onrampProviders, NETWORK_FEE_SUI } from '../data/mockData.js';

/** Carry only the decimals the asset is shown to — a hidden third decimal is
    a figure nobody agreed to. */
const toAssetPrecision = (n, asset) => round(n, ASSETS[asset]?.dp ?? 2);

export const rateMyr = (asset) => ASSETS[asset]?.myr ?? 0;

/** What one unit of `from` is worth in `to`. */
export const pairRate = (from, to) => rateMyr(from) / rateMyr(to);

const round = (n, dp = 6) => Math.round((Number(n) || 0) * 10 ** dp) / 10 ** dp;

/* ------------------------------------------------------------------ */
/* Swap                                                                */
/* ------------------------------------------------------------------ */

/** The pool the demo routes through. Sui's own DEX, named so the route is real. */
export const SWAP_ROUTE = 'Cetus · SUI/USDT';

/** Taken by the pool, not by us — the standard 0.3% AMM fee. */
export const POOL_FEE_RATE = 0.003;

/** Default tolerance, the same figure wallets ship with. */
export const DEFAULT_SLIPPAGE = 0.005;

/**
 * A swap quote. Price impact grows with the size of the order relative to the
 * pool, which is why a big swap gets a worse rate than a small one — a flat
 * rate here would be the part that gives a demo away.
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

/* ------------------------------------------------------------------ */
/* Buy                                                                 */
/* ------------------------------------------------------------------ */

/**
 * One quote per provider for the same ringgit amount, best first. Each takes
 * a percentage fee and quotes off its own spread on the mid price, so the
 * cheapest fee is not always the most coin — which is the point of comparing.
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

/* ------------------------------------------------------------------ */
/* Cash out                                                            */
/* ------------------------------------------------------------------ */

/** What the off-ramp takes turning a stablecoin into ringgit. */
export const OFFRAMP_FEE_RATE = 0.009;

/** A flat processing charge on top, the way a payout partner bills it. */
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
