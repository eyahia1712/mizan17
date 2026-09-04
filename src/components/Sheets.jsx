import { useState } from 'react';
import { contacts, payoutMethods } from '../data/mockData.js';
import { sui, myr, explorerAddr, explorerTx } from '../lib/format.js';
import { whenLabel, round } from '../lib/ledger.js';
import { fundFromFaucet } from '../lib/sui.js';
import { Tick, Copy, External } from './Icons.jsx';

/* ------------------------------------------------------------------ */
/* Receive                                                             */
/* ------------------------------------------------------------------ */

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
 * A deterministic block pattern derived from the address. Stands in for a
 * scannable code without pulling in a QR dependency.
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

/* ------------------------------------------------------------------ */
/* Split                                                               */
/* ------------------------------------------------------------------ */

export function SplitSheet({ close, onRequest }) {
  const people = contacts.slice(1, 4);
  const [total, setTotal] = useState('45');
  const [picked, setPicked] = useState(people.map((c) => c.id));

  const value = Number(total) || 0;
  const heads = picked.length + 1;               // plus you
  const each = value / heads;

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <>
      <h3>Split</h3>

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
        <div className="hint num">{myr(value)}</div>
      </div>

      <div className="picker">
        {people.map((c) => {
          const on = picked.includes(c.id);
          return (
            <button
              key={c.id}
              className={`pick${on ? ' on' : ''}`}
              onClick={() => toggle(c.id)}
              aria-pressed={on}
            >
              <span className="ring" aria-hidden="true">{c.name[0]}</span>
              <span className="pi">
                <span className="p1">{c.name}</span>
                <span className="p2">{c.rel}</span>
              </span>
              <span className="p3 num">{on ? sui(each) : '—'}</span>
              <span className="check"><Tick /></span>
            </button>
          );
        })}
      </div>

      <div className="rows">
        <div className="row"><span>Between</span><span>{heads} people</span></div>
        <div className="row"><span>Your share</span><span className="num">{sui(each)}</span></div>
        <div className="row"><span>You collect</span><span className="num">{sui(each * picked.length)}</span></div>
        <div className="row"><span>In ringgit</span><span className="num">{myr(each * picked.length)}</span></div>
      </div>

      <button
        className="cta"
        disabled={!picked.length || value <= 0}
        onClick={() => { onRequest?.(picked.length, each); close(); }}
      >
        Request
      </button>
      <button className="cta ghost" onClick={close}>Cancel</button>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Cash out                                                            */
/* ------------------------------------------------------------------ */

export function WithdrawSheet({ close, balanceSui, onOpenWallet }) {
  const [method, setMethod] = useState(payoutMethods[0].id);

  return (
    <>
      <h3>Cash out</h3>

      <div className="rows">
        <div className="row"><span>Available</span><span className="num">{sui(balanceSui)}</span></div>
        <div className="row"><span>In ringgit</span><span className="num">{myr(balanceSui)}</span></div>
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

/* ------------------------------------------------------------------ */
/* Transaction receipt                                                 */
/* ------------------------------------------------------------------ */

/**
 * Saffron is the settled-event colour, so it carries both directions —
 * the sign and the label say which way the money went, not a second hue.
 */
export function TransactionSheet({ close, tx }) {
  const incoming = tx.dir === 'in';
  const debited = round(tx.sui + (tx.kind === 'transfer' ? tx.fee : 0));

  return (
    <>
      <h3>Receipt</h3>

      <div className="receipt">
        <div className="eyebrow">{incoming ? 'Received' : 'Sent'}</div>
        <div className="receipt-amt">
          {incoming ? '+' : '−'}{sui(tx.sui)}
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
        <div className="row"><span>Amount</span><span className="num">{sui(tx.sui)}</span></div>
        <div className="row"><span>In ringgit</span><span className="num">{myr(tx.sui)}</span></div>
        <div className="row"><span>Fee</span><span className="num">{sui(tx.fee)}</span></div>
        {!incoming && <div className="row"><span>Debited</span><span className="num">{sui(debited)}</span></div>}
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

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

/**
 * Holds the one control the judges need and the user never does: the switch
 * between fixture data and a real testnet transfer. Kept off the main screens
 * on purpose.
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
        <span className="wallet-open-v num">{sui(balanceSui)}</span>
      </button>

      <div className="rows">
        <div className="row"><span>Name</span><span>{profile.name}</span></div>
        {profile.email && <div className="row"><span>Google</span><span>{profile.email}</span></div>}
        <div className="row"><span>Network</span><span>Sui testnet</span></div>
        <div className="row"><span>Balance</span><span className="num">{sui(balanceSui)}</span></div>
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
