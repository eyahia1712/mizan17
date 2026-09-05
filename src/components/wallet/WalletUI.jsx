/**
 * The wallet's own icons, marks and screen primitives.
 *
 * The wallet is a self-contained surface with its own icon set and palette.
 * Nothing here inherits from the Mizan design system and nothing leaks back —
 * every class is namespaced under .tw.
 */

import { useState } from 'react';
import { CURRENCIES, CURRENCY_CODES } from '../../lib/currency.js';

/* ------ icons: 24px grid, heavier than the Mizan set on purpose ---- */

const svg = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const IcSend    = (p) => <svg {...svg} {...p}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
export const IcReceive = (p) => <svg {...svg} {...p}><path d="M12 5v14M19 12l-7 7-7-7" /></svg>;
export const IcBuy     = (p) => <svg {...svg} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const IcSell    = (p) => <svg {...svg} {...p}><path d="M3 9.5 12 4l9 5.5M5.5 10v8M18.5 10v8M12 10v8M3 20h18" /></svg>;
export const IcSwap    = (p) => <svg {...svg} {...p}><path d="M4 8h13M13.5 4.5 17 8l-3.5 3.5M20 16H7m3.5-3.5L7 16l3.5 3.5" /></svg>;
export const IcBack    = (p) => <svg {...svg} {...p}><path d="m15 18-6-6 6-6" /></svg>;
export const IcNext    = (p) => <svg {...svg} {...p}><path d="m9 18 6-6-6-6" /></svg>;
export const IcDown    = (p) => <svg {...svg} {...p}><path d="m6 9 6 6 6-6" /></svg>;
export const IcCopy    = (p) => <svg {...svg} {...p}><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M15 5.5A2.5 2.5 0 0 0 12.5 4H6a2 2 0 0 0-2 2v6.5A2.5 2.5 0 0 0 6.5 15" /></svg>;
export const IcCheck   = (p) => <svg {...svg} {...p}><path d="M20 6 9 17l-5-5" /></svg>;
export const IcClose   = (p) => <svg {...svg} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>;
export const IcHome    = (p) => <svg {...svg} {...p}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></svg>;
export const IcClock   = (p) => <svg {...svg} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>;
export const IcCard    = (p) => <svg {...svg} {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19" /></svg>;
export const IcQr      = (p) => <svg {...svg} {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><path d="M13.5 13.5h3v3m4 0v4h-4v-3" /></svg>;
export const IcShield  = (p) => <svg {...svg} {...p}><path d="M12 3.5 5 6.2v5.4c0 4.2 2.9 7.6 7 8.9 4.1-1.3 7-4.7 7-8.9V6.2z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>;
export const IcGlobe   = (p) => <svg {...svg} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.2 2.4 3.4 5.4 3.4 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.4-5.4-3.4-8.5S9.8 5.9 12 3.5Z" /></svg>;
export const IcEye     = (p) => <svg {...svg} {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>;

/* ----------------------------- marks ----------------------------- */

/* Third-party marks keep their own colours, because a brand is recognised by
   its colour. All of them are drawn inline rather than fetched. */

/** Trust Wallet's shield. */
export const TrustMark = ({ size = 22 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <path
      fill="#0500FF"
      d="M16 2.4 4.9 6.7v9.5c0 6.7 4.5 12.9 11.1 14.8V2.4Z"
    />
    <path
      fill="#3375BB"
      d="M16 2.4v28.6c6.6-1.9 11.1-8.1 11.1-14.8V6.7Z"
    />
    <path
      fill="#fff"
      d="M16 7.4 9.4 10v6.1c0 4 2.6 7.7 6.6 9 4-1.3 6.6-5 6.6-9V10Zm0 2.6 4.6 1.8v4.3c0 2.8-1.7 5.4-4.6 6.5Z"
      opacity=".92"
    />
  </svg>
);

/** Touch 'n Go eWallet. */
export const TngMark = ({ size = 34 }) => (
  <span className="tw-brand" style={{ width: size, height: size, background: '#005AAB' }} aria-hidden="true">
    <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62}>
      <path fill="#fff" d="M4.6 6.4h9.2v2.5h-3.2v8.7H7.8V8.9H4.6Z" />
      <path fill="#8DC63F" d="M19.4 10.2a3.8 3.8 0 1 1-3.8 3.8h2.2a1.6 1.6 0 1 0 1.6-1.6Z" />
    </svg>
  </span>
);

/** CIMB. */
export const CimbMark = ({ size = 34 }) => (
  <span className="tw-brand" style={{ width: size, height: size, background: '#E30613' }} aria-hidden="true">
    <span style={{ color: '#fff', fontSize: size * 0.3, fontWeight: 700, letterSpacing: '.02em' }}>CIMB</span>
  </span>
);

/** Tether. */
export const UsdtMark = ({ size = 40 }) => (
  <span className="tw-brand round" style={{ width: size, height: size, background: '#009393' }} aria-hidden="true">
    <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6}>
      <path fill="#fff" d="M6 5h12v2.6h-4.6v1.5c3 .2 5.2.9 5.2 1.7s-2.2 1.5-5.2 1.7v6.1h-2.8v-6.1c-3-.2-5.2-.9-5.2-1.7s2.2-1.5 5.2-1.7V7.6H6Zm6 6.9c2.4 0 4.4-.4 4.4-.8s-2-.8-4.4-.8-4.4.4-4.4.8 2 .8 4.4.8Z" />
    </svg>
  </span>
);

/** An on-ramp provider, as a monogram. */
export const ProviderMark = ({ name, size = 34 }) => (
  <span className="tw-brand" style={{ width: size, height: size }} aria-hidden="true">
    <span style={{ fontSize: size * 0.4, fontWeight: 600 }}>{name[0]}</span>
  </span>
);

export const RailMark = ({ rail, size = 34 }) => {
  if (rail.short === 'TNG') return <TngMark size={size} />;
  if (rail.short === 'CIMB') return <CimbMark size={size} />;
  return <span className="tw-brand" style={{ width: size, height: size }} aria-hidden="true"><IcCard width={18} height={18} /></span>;
};

/** The Sui mark: a droplet, white on Sui blue. */
export const SuiMark = ({ size = 40 }) => (
  <span className="tw-coin tw-brand round" style={{ width: size, height: size, background: '#4DA2FF' }} aria-hidden="true">
    <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58}>
      <path
        fill="#fff"
        d="M12 2.6c.9 1.3 5.9 7.1 5.9 11.1A5.9 5.9 0 0 1 6.1 13.7C6.1 9.7 11.1 3.9 12 2.6Zm0 3.3c-1.4 2-3.6 5.3-3.6 7.8a3.6 3.6 0 1 0 7.2 0c0-2.5-2.2-5.8-3.6-7.8Z"
      />
    </svg>
  </span>
);

/* -------------------------- screen shell ------------------------- */

export function Screen({ title, onBack, right, children, foot }) {
  return (
    <div className="tw-screen">
      <header className="tw-bar">
        {onBack ? (
          <button className="tw-icon-btn" onClick={onBack} aria-label="Back"><IcBack width={22} height={22} /></button>
        ) : <span className="tw-icon-btn tw-icon-btn--ghost" />}
        <h2>{title}</h2>
        <span className="tw-bar-right">{right ?? <span className="tw-icon-btn tw-icon-btn--ghost" />}</span>
      </header>

      <div className="tw-body">{children}</div>
      {foot && <div className="tw-foot">{foot}</div>}
    </div>
  );
}

/* ---------------------------- pieces ----------------------------- */

export const Detail = ({ label, value, strong }) => (
  <div className={`tw-detail${strong ? ' strong' : ''}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export function CopyField({ label, value, lines = false }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      setDone(false);
    }
  }

  return (
    <div className="tw-copyfield">
      {label && <span className="tw-label">{label}</span>}
      <div className={`tw-copyrow${lines ? ' wrap' : ''}`}>
        <span className="tw-hash">{value}</span>
        <button className="tw-icon-btn" onClick={copy} aria-label={done ? 'Copied' : 'Copy'}>
          {done ? <IcCheck width={18} height={18} /> : <IcCopy width={18} height={18} />}
        </button>
      </div>
    </div>
  );
}

/** The big amount input every entry screen is built around. */
export function AmountField({ value, onChange, unit = 'SUI', sub, max, onMax, error, autoFocus }) {
  return (
    <div className="tw-amount-wrap">
      <div className={`tw-amount${error ? ' bad' : ''}`}>
        <input
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
          aria-label={`Amount in ${unit}`}
          autoFocus={autoFocus}
        />
        <span className="tw-amount-unit">{unit}</span>
      </div>

      <div className="tw-amount-foot">
        <span className={error ? 'tw-bad' : undefined}>{error ?? sub}</span>
        {onMax && <button className="tw-max" onClick={onMax}>Max {max}</button>}
      </div>
    </div>
  );
}

export function MethodRow({ mark, title, sub, on, onClick, right }) {
  return (
    <button className={`tw-method${on ? ' on' : ''}`} onClick={onClick} aria-pressed={on}>
      <span className="tw-method-mark">{mark}</span>
      <span className="tw-method-body">
        <span className="tw-method-t">{title}</span>
        {sub && <span className="tw-method-s">{sub}</span>}
      </span>
      {right ?? <span className="tw-radio" data-on={String(!!on)} aria-hidden="true" />}
    </button>
  );
}

/** The end of every flow, so success always reads the same. */
export function Success({ title, amount, sub, details, onDone, doneLabel = 'Done' }) {
  return (
    <div className="tw-success">
      <span className="tw-tick" aria-hidden="true"><IcCheck width={30} height={30} /></span>
      <h3>{title}</h3>
      <p className="tw-success-amt">{amount}</p>
      {sub && <p className="tw-success-sub">{sub}</p>}

      {details?.length > 0 && (
        <div className="tw-details">
          {details.map((d) => <Detail key={d.label} {...d} />)}
        </div>
      )}

      <button className="tw-btn" onClick={onDone}>{doneLabel}</button>
    </div>
  );
}

/**
 * A price line generated from a seed, so the same asset always draws the same
 * shape. Drawn in ink rather than green or red — the signed figure above it
 * already says which way the price moved.
 */
export function Sparkline({ seed = 'sui', points = 40, up = true }) {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;

  const ys = [];
  let v = 50;
  for (let i = 0; i < points; i++) {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;  x >>>= 0;
    v += ((x % 100) - 46) * 0.7 + (up ? 0.55 : -0.55);
    ys.push(Math.max(6, Math.min(94, v)));
  }

  const step = 100 / (points - 1);
  const d = ys.map((y, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(2)} ${(100 - y).toFixed(2)}`).join(' ');

  return (
    <svg className="tw-spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L100 100 L0 100 Z`} fill="#111110" opacity=".07" />
      <path d={d} fill="none" stroke="#111110" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Stands in for a scannable code without pulling in a QR library. */
export function QrBlock({ value = '', size = 21, px = 196 }) {
  let seed = 0;
  for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) >>> 0;

  const cells = [];
  let x = seed || 1;
  for (let i = 0; i < size * size; i++) {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;  x >>>= 0;
    cells.push(x % 100 < 46);
  }

  const finder = (r, c) =>
    (r < 5 && c < 5) || (r < 5 && c >= size - 5) || (r >= size - 5 && c < 5);
  const hole = (r, c) =>
    (r >= 1 && r <= 3 && c >= 1 && c <= 3) ||
    (r >= 1 && r <= 3 && c >= size - 4 && c <= size - 2) ||
    (r >= size - 4 && r <= size - 2 && c >= 1 && c <= 3);

  return (
    <svg width={px} height={px} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Wallet address code">
      <rect width={size} height={size} fill="#FAF9F5" />
      {cells.map((on, i) => {
        const r = Math.floor(i / size);
        const c = i % size;
        const dark = finder(r, c) ? !hole(r, c) : on;
        return dark ? <rect key={i} x={c} y={r} width="1" height="1" fill="#111110" /> : null;
      })}
    </svg>
  );
}

/** Whichever coin mark the asset calls for. */
export const AssetMark = ({ asset, size = 40 }) =>
  asset === 'USDT' ? <UsdtMark size={size} /> : <SuiMark size={size} />;

/**
 * Which currency the wallet is counted in. A native select, because eleven
 * options on a touch screen are better handled by the platform's own picker.
 */
export function CurrencyPicker({ value, onChange, id }) {
  return (
    <span className="tw-cur">
      <select
        id={id}
        className="tw-cur-select"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label="Display currency"
      >
        {CURRENCY_CODES.map((code) => (
          <option key={code} value={code}>{code} · {CURRENCIES[code].name}</option>
        ))}
      </select>
      <span className="tw-cur-face" aria-hidden="true">
        {value} <IcDown width={13} height={13} />
      </span>
    </span>
  );
}

