import { useState } from 'react';
import { contacts, payoutMethods } from '../data/mockData.js';
import { token, fiat, cash, explorerAddr, explorerTx } from '../lib/format.js';
import { getCurrency } from '../lib/currency.js';
import { whenLabel, round, feeOnTop } from '../lib/ledger.js';
import { fundFromFaucet } from '../lib/sui.js';
import { Tick, Copy, External } from './Icons.jsx';

/* ---------------------------- receive ---------------------------- */

export function ReceiveSheet({ close, address }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <h3>Receive</h3>

      <div className="qr-wrap">
        <div className="qr"><QrBlock value={address} /></div>
      </div>

      <div className="field">
        <label>Your address</label>
        <div className="mono-block">{address}</div>
      </div>

      <button className="cta" onClick={copy}>
        {copied ? <><Tick width={16} height={16} /> Copied</> : <><Copy width={16} height={16} /> Copy</>}
      </button>
      <button className="cta ghost" onClick={close}>Close</button>
    </>
  );
}

/**
 * A block pattern derived from the address. It stands in for a scannable code
 * without pulling in a QR library.
 */
function QrBlock({ value = '', size = 15 }) {
  const cells = [];
  let seed = 0;
  for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) >>> 0;

  let x = seed || 1;
  for (let i = 0; i < size * size; i++) {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
    cells.push(x % 100 < 46);
  }

  const finder = (r, c) =>
    (r < 4 && c < 4) || (r < 4 && c >= size - 4) || (r >= size - 4 && c < 4);

  return (
    <svg width="168" height="168" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Payment code">
      <rect width={size} height={size} fill="#fff" />
      {cells.map((on, i) => {
        const r = Math.floor(i / size);
        const c = i % size;
        const dark = finder(r, c)
          ? !((r >= 1 && r <= 2 && c >= 1 && c <= 2) ||
              (r >= 1 && r <= 2 && c >= size - 3 && c <= size - 2) ||
              (r >= size - 3 && r <= size - 2 && c >= 1 && c <= 2))
          : on;
        return dark ? <rect key={i} x={c} y={r} width="1" height="1" fill="#111110" /> : null;
      })}
    </svg>
  );
}

/* ----------------------------- split ----------------------------- */

/**
 * Splitting a bill is a claim on somebody, and a claim needs a reason: "Nurul
 * owes you 15 SUI" means nothing a week later, "Wi-Fi, September, between 4"
 * does. So the occasion is asked for first and travels with the request.
 */

const OCCASIONS = ['Room rent', 'Wi-Fi bill', 'Utilities', 'Groceries', 'Dinner', 'Transport'];

export function SplitSheet({ close, onRequest }) {
  const people = contacts.slice(1, 4);

  const [reason, setReason] = useState('');
  const [total, setTotal] = useState('45');
  const [heads, setHeads] = useState(4);          // including you
  const [picked, setPicked] = useState(people.map((c) => c.id));

  const value = Number(total) || 0;
  const each = heads > 0 ? value / heads : 0;

  /* You are always one of the heads, so the others are one fewer. */
  const others = heads - 1;
  const named = picked.slice(0, others);
  const unnamed = Math.max(0, others - named.length);

  const label = reason.trim();
  const ready = label.length > 0 && value > 0 && heads >= 2;

  const toggle = (id) =>
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= others) return p;            // no seats left
      return [...p, id];
    });

  const setCount = (n) => {
    const next = Math.max(2, Math.min(12, n));
    setHeads(next);
    setPicked((p) => p.slice(0, next - 1));
  };

  return (
    <>
      <h3>Split a bill</h3>

      <div className="field">
        <label htmlFor="reason">What is it for?</label>
        <input
          id="reason"
          autoComplete="off"
          placeholder="Room rent, Wi-Fi, groceries…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="reasons">
          {OCCASIONS.map((o) => (
            <button
              key={o}
              className={`reason${label.toLowerCase() === o.toLowerCase() ? ' on' : ''}`}
              onClick={() => setReason(o)}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="total">Total</label>
        <div className="amount-input">
          <input
            id="total"
            inputMode="decimal"
            autoComplete="off"
            value={total}
            onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
          />
          <span className="cur">SUI</span>
        </div>
        <div className="hint num">{fiat(value)}</div>
      </div>

      <div className="field">
        <label>Between how many people?</label>
        <div className="stepper">
          <button onClick={() => setCount(heads - 1)} disabled={heads <= 2} aria-label="One fewer person">−</button>
          <span className="stepper-v num">
            {heads}
            <span className="stepper-l">including you</span>
          </span>
          <button onClick={() => setCount(heads + 1)} disabled={heads >= 12} aria-label="One more person">+</button>
        </div>
        <div className="hint num">{fiat(each)} each · {token(each)} each</div>
      </div>

      <div className="field">
        <div className="field-head">
          <label>Request from</label>
          <span className="hint" style={{ margin: 0 }}>
            {named.length} of {others} named
          </span>
        </div>
        <div className="picker">
          {people.map((c) => {
            const on = named.includes(c.id);
            const full = !on && named.length >= others;
            return (
              <button
                key={c.id}
                className={`pick${on ? ' on' : ''}`}
                onClick={() => toggle(c.id)}
                aria-pressed={on}
                disabled={full}
              >
                <span className="ring" aria-hidden="true">{c.name[0]}</span>
                <span className="pi">
                  <span className="p1">{c.name}</span>
                  <span className="p2">{c.rel}</span>
                </span>
                <span className="p3 num">{on ? token(each) : '—'}</span>
                <span className="check"><Tick /></span>
              </button>
            );
          })}
        </div>
        {unnamed > 0 && (
          <p className="hint">
            {unnamed} {unnamed === 1 ? 'share is' : 'shares are'} counted but not named — the split
            still divides by {heads}.
          </p>
        )}
      </div>

      <div className="rows">
        <div className="row"><span>Occasion</span><span>{label || '—'}</span></div>
        <div className="row"><span>Between</span><span>{heads} people</span></div>
        <div className="row"><span>Your share</span><span className="num">{token(each)}</span></div>
        <div className="row"><span>You collect</span><span className="num">{token(each * named.length)}</span></div>
        <div className="row"><span>In {getCurrency()}</span><span className="num">{fiat(each * named.length)}</span></div>
      </div>

      <button
        className="cta"
        disabled={!ready || named.length === 0}
        onClick={() => { onRequest?.({ reason: label, heads, each, from: named.length }); close(); }}
      >
        {ready ? `Request ${token(each)} each` : 'Name it and set a total'}
      </button>
      <button className="cta ghost" onClick={close}>Cancel</button>
    </>
  );
}

/* ---------------------------- cash out --------------------------- */

export function WithdrawSheet({ close, balanceSui, onOpenWallet }) {
  const [method, setMethod] = useState(payoutMethods[0].id);

  return (
    <>
      <h3>Cash out</h3>

      <div className="rows">
        <div className="row"><span>Available</span><span className="num">{token(balanceSui)}</span></div>
        <div className="row"><span>In {getCurrency()}</span><span className="num">{fiat(balanceSui)}</span></div>
      </div>

      <div className="picker">
        {payoutMethods.map((m) => (
          <button
            key={m.id}
            className={`pick${method === m.id ? ' on' : ''}`}
            onClick={() => setMethod(m.id)}
            aria-pressed={method === m.id}
          >
            <span className="ring" aria-hidden="true">{m.code}</span>
            <span className="pi">
              <span className="p1">{m.name}</span>
              <span className="p2">{m.sub}</span>
            </span>
            <span className="check"><Tick /></span>
          </button>
        ))}
      </div>

      <button className="cta" onClick={() => onOpenWallet?.('sell')}>Continue in wallet</button>
      <button className="cta ghost" onClick={close}>Cancel</button>
    </>
  );
}

/* ------------------------- transaction receipt ------------------- */

/**
 * The receipt. Both directions use the same saffron block — the sign and the
 * label say which way the money went, not a second colour.
 */
export function TransactionSheet({ close, tx }) {
  const incoming = tx.dir === 'in';
  const debited = round(tx.amount + (feeOnTop(tx) ? tx.fee : 0));

  return (
    <>
      <h3>Receipt</h3>

      <div className="receipt">
        <div className="eyebrow">{incoming ? 'Received' : 'Sent'}</div>
        <div className="receipt-amt">
          {incoming ? '+' : '−'}{token(tx.amount, tx.asset)}
        </div>
        <div className="receipt-to">
          {incoming ? 'from' : 'to'} {tx.title}
        </div>
      </div>

      <div className="rows">
        <div className="row">
          <span>{incoming ? 'From' : 'To'}</span>
          <span>{tx.title}</span>
        </div>
        {tx.handle && (
          <div className="row"><span>Account</span><span>{tx.handle}</span></div>
        )}
        <div className="row"><span>When</span><span>{whenLabel(tx.ts)}</span></div>
        <div className="row"><span>Amount</span><span className="num">{token(tx.amount, tx.asset)}</span></div>
        <div className="row"><span>In {getCurrency()}</span><span className="num">{tx.fiatMyr != null ? cash(tx.fiatMyr) : fiat(tx.amount, tx.asset)}</span></div>
        <div className="row"><span>Fee</span><span className="num">{token(tx.fee, tx.asset)}</span></div>
        {!incoming && <div className="row"><span>Debited</span><span className="num">{token(debited, tx.asset, { up: true })}</span></div>}
        <div className="row"><span>Network</span><span>Sui testnet</span></div>
        <div className="row">
          <span>Status</span>
          <span>{tx.pending ? 'Awaiting payment' : tx.real ? 'Settled on chain' : 'Demo record'}</span>
        </div>
      </div>

      {tx.digest && (
        <div className="field">
          <label>Transaction digest</label>
          <div className="mono-block">{tx.digest}</div>
        </div>
      )}

      {tx.real ? (
        <a className="link" href={explorerTx(tx.digest)} target="_blank" rel="noreferrer">
          View on Suiscan <External />
        </a>
      ) : (
        <p className="hint">
          This entry is demonstration data. Transfers made in live mode carry a real
          digest and link to the explorer.
        </p>
      )}

      <button className="cta" onClick={close}>Close</button>
    </>
  );
}

/* ---------------------------- account ---------------------------- */

/**
 * The account sheet. It holds the Live transfers switch — the one control that
 * turns a demo transfer into a real testnet one — kept off the main screens.
 */
export function AccountSheet({ close, profile, address, live, setLive, balanceSui, onOpenWallet }) {
  const [funding, setFunding] = useState(false);
  const [note, setNote] = useState(null);

  async function fund() {
    setFunding(true);
    setNote(null);
    try {
      await fundFromFaucet(address);
      setNote({ ok: true, text: 'Coins requested. Balance updates shortly.' });
    } catch {
      setNote({ ok: false, text: 'The faucet declined. Use faucet.sui.io with your address instead.' });
    } finally {
      setFunding(false);
    }
  }

  return (
    <>
      <h3>Account</h3>

      <button className="wallet-open" onClick={() => onOpenWallet?.('home')}>
        <span className="wallet-open-i" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M12 2.6c.9 1.3 5.9 7.1 5.9 11.1A5.9 5.9 0 0 1 6.1 13.7C6.1 9.7 11.1 3.9 12 2.6Zm0 3.3c-1.4 2-3.6 5.3-3.6 7.8a3.6 3.6 0 1 0 7.2 0c0-2.5-2.2-5.8-3.6-7.8Z" />
          </svg>
        </span>
        <span className="wallet-open-b">
          <span className="wallet-open-t">Wallet</span>
          <span className="wallet-open-s">Send, receive, buy and cash out SUI</span>
        </span>
        <span className="wallet-open-v num">{token(balanceSui)}</span>
      </button>

      <div className="rows">
        <div className="row"><span>Name</span><span>{profile.name}</span></div>
        {profile.email && <div className="row"><span>Google</span><span>{profile.email}</span></div>}
        <div className="row"><span>Network</span><span>Sui testnet</span></div>
        <div className="row"><span>Balance</span><span className="num">{token(balanceSui)}</span></div>
      </div>

      <button
        className="set"
        role="switch"
        aria-checked={live}
        onClick={() => setLive(!live)}
      >
        <span className="si">
          <span className="s1">Live transfers</span>
          <span className="s2">{live ? 'Signing real testnet transactions' : 'Using demo data'}</span>
        </span>
        <span className="switch" aria-hidden="true" data-on={String(live)}>
          <span className="knob" />
        </span>
      </button>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Address</label>
        <div className="mono-block">{address}</div>
      </div>

      {note && <p className={`err${note.ok ? ' ok' : ''}`}>{note.text}</p>}

      <button className="cta" onClick={fund} disabled={funding}>
        {funding ? <><span className="spinner" /> Requesting</> : 'Add test coins'}
      </button>

      <a className="link" href={explorerAddr(address)} target="_blank" rel="noreferrer">
        View on explorer <External />
      </a>

      <button className="cta ghost" onClick={close}>Close</button>
    </>
  );
}
