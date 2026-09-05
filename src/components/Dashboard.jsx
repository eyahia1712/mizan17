import { useState, useMemo } from 'react';
import { token, fiat, suiNum, shortAddr } from '../lib/format.js';
import { monthlySeries } from '../lib/ledger.js';
import { Copy, Tick } from './Icons.jsx';

/* --------------------- the account, as a card -------------------- */

export function PaymentCard({ balanceSui, address, live, name }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="pcard" aria-label="Account">
      <div className="pcard-top">
        <span className="pcard-mark">MIZAN</span>
        <span className={`tag${live ? ' on' : ''}`}>{live ? 'Live' : 'Demo'}</span>
      </div>

      <span className="chip" aria-hidden="true" />

      {/* Hero figure: proportional digits — tabular reads loose at this size. */}
      <div className="pcard-amt">{token(balanceSui)}</div>
      <div className="pcard-sub num">{fiat(balanceSui)}</div>

      <div className="pcard-foot">
        <span className="pcard-addr">
          <span className="eyebrow">Your Sui address</span>
          <span className="mono">
            {address ? shortAddr(address, 10, 8) : <span className="sk sk-line" />}
          </span>
        </span>
        <button className="pcard-copy" onClick={copy} disabled={!address}>
          {copied ? <><Tick width={13} height={13} /> Copied</> : <><Copy width={13} height={13} /> Copy</>}
        </button>
      </div>

      <div className="pcard-name">
        <span>{name}</span>
        <span>Sui testnet</span>
      </div>
    </section>
  );
}

/* ----------------- six months, and the one picked ---------------- */

/** Round up to a clean axis top, so the ticks read 0 / half / max. */
function axisTop(max) {
  if (!(max > 0)) return 10;
  const mag = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (m * mag >= max) return m * mag;
  }
  return 10 * mag;
}

/* Axis ticks and bar caps: no decimals when there are none to show, and never a
   rounded half — "63" for an axis top of 62.5 is wrong, not shorter. */
const tick = (n) => suiNum(n, { dp: Number.isInteger(n) ? 0 : n >= 10 ? 1 : 2 });

/**
 * The tiles and the chart are one component because they describe the same
 * month: pick a bar and the tiles follow. Every figure is summed from the
 * transaction list.
 */
export function MonthlyPanel({ items }) {
  const series = useMemo(() => monthlySeries(items, 6), [items]);
  const [picked, setPicked] = useState(series.length - 1);
  const [hover, setHover] = useState(null);

  const current = series.length - 1;
  const i = Math.min(picked, series.length - 1);
  const month = series[i] ?? { sent: 0, received: 0, fees: 0, label: '', year: '', out: 0 };
  const top = axisTop(Math.max(...series.map((d) => d.sent)));

  const tiles = [
    { label: 'Sent', value: token(month.sent) },
    { label: 'Received', value: token(month.received) },
    { label: 'Fees paid', value: token(month.fees) },
  ];

  return (
    <>
      <div className="tiles">
        {tiles.map((t) => (
          <div key={t.label} className="tile">
            <span className="tile-l">{t.label}</span>
            <span className="tile-v">{t.value}</span>
          </div>
        ))}
      </div>

      <p className="tiles-note">
        {month.label} {month.year} · {month.out} {month.out === 1 ? 'transfer' : 'transfers'} out ·
        {' '}worth {fiat(month.sent)}
      </p>

      <section className="section">
        <div className="section-head">
          <h3>Sent per month</h3>
          <span className="chart-note">SUI · last six months</span>
        </div>

        <div className="chart">
          <div className="chart-axis" aria-hidden="true">
            <span>{tick(top)}</span>
            <span>{tick(top / 2)}</span>
            <span>0</span>
          </div>

          <div className="chart-plot">
            <span className="gridline" style={{ top: 0 }} aria-hidden="true" />
            <span className="gridline" style={{ top: '50%' }} aria-hidden="true" />
            <span className="gridline base" style={{ top: '100%' }} aria-hidden="true" />

            <div className="chart-cols">
              {series.map((d, n) => (
                <button
                  key={d.key}
                  className={`chart-col${n === current ? ' now' : ''}${n === i ? ' picked' : ''}${hover === n ? ' hot' : ''}`}
                  onClick={() => setPicked(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(n)}
                  onBlur={() => setHover(null)}
                  aria-pressed={n === i}
                  aria-label={`${d.label} ${d.year}: ${token(d.sent)} sent`}
                >
                  {/* The label rides the top of the bar, so it lives inside it. */}
                  <span className="bar" style={{ height: `${(d.sent / top) * 100}%` }}>
                    {hover === n ? (
                      <span className="chart-tip num">{token(d.sent)}</span>
                    ) : n === i && (
                      /* Only the month in focus is labelled, never every bar. */
                      <span className="chart-cap num">{tick(d.sent)}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-labels" aria-hidden="true">
          {series.map((d, n) => (
            <span key={d.key} className={n === i ? 'now' : undefined}>{d.label}</span>
          ))}
        </div>
      </section>
    </>
  );
}
