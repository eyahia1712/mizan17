import { useState, useMemo } from 'react';
import { payoutRails, onrampProviders } from '../../data/mockData.js';
import { token, fiat, cash, shortAddr, explorerTx, explorerAddr } from '../../lib/format.js';
import {
  checkAmount, sendableFrom, totalCost, round, feeOnTop,
  NETWORK_FEE_SUI, whenLabel, byNewest, monthKey, monthLabel,
} from '../../lib/ledger.js';
import {
  buyQuotes, swapQuote, payoutQuote, rateMyr,
  SWAP_ROUTE, POOL_FEE_RATE, OFFRAMP_FEE_RATE, OFFRAMP_FLAT_MYR,
} from '../../lib/market.js';
import { isValidSuiAddress, sendSui } from '../../lib/sui.js';
import { loadRecipients, saveRecipient, findRecipient } from '../../lib/recipients.js';
import {
  Screen, Detail, CopyField, AmountField, MethodRow, Success, QrBlock,
  SuiMark, AssetMark, RailMark, ProviderMark,
  IcSend, IcReceive, IcCard, IcCheck, IcNext, IcSwap, IcShield, IcEye, IcGlobe,
  CurrencyPicker,
} from './WalletUI.jsx';
import { CURRENCIES } from '../../lib/currency.js';

/* ================================================================== */
/* Send                                                                */
/* ================================================================== */

export function SendFlow({ balance, address, live, keypair, spendable, onCommit, onExit }) {
  const [step, setStep] = useState('form');     // form | confirm | sending | done
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [saveAs, setSaveAs] = useState('');
  const [people, setPeople] = useState(() => loadRecipients());
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  // A live transfer spends real testnet coins, so the limit is what the
  // account holds on chain — not the demo balance.
  const limit = live ? (spendable ?? 0) : balance;

  const value = Number(amount) || 0;
  const amountError = checkAmount(amount, limit);
  const addressOk = isValidSuiAddress(to);
  const named = findRecipient(to, people);
  const max = sendableFrom(limit);
  const canContinue = value > 0 && !amountError && addressOk;

  async function confirm() {
    setError(null);
    setStep('sending');
    try {
      let digest;
      if (live) {
        digest = await sendSui({ keypair, recipient: to.trim(), amountSui: value });
      } else {
        await new Promise((r) => setTimeout(r, 1400));
      }
      // A recipient you have now paid is one you should not have to type again.
      const name = named?.name ?? saveAs.trim() ?? '';
      if (!named) {
        saveRecipient({ name: saveAs.trim() || shortAddr(to.trim(), 8, 6), address: to.trim() });
        setPeople(loadRecipients());
      }

      const tx = onCommit({
        dir: 'out',
        kind: 'transfer',
        title: name || shortAddr(to.trim(), 8, 6),
        sui: value,
        handle: named?.handle ?? shortAddr(to.trim(), 8, 6),
        fee: NETWORK_FEE_SUI,
        digest,
        real: live,
        toAddress: to.trim(),
      });
      setDone(tx);
      setStep('done');
    } catch (e) {
      setError(e?.message ?? 'The transfer could not be completed.');
      setStep('form');
    }
  }

  if (step === 'done' && done) {
    return (
      <Screen title="Sent">
        <Success
          title="Transfer sent"
          amount={`− ${token(done.amount)}`}
          sub={`to ${done.title} · ${fiat(done.amount)}`}
          details={[
            { label: 'Network fee', value: token(done.fee) },
            { label: 'Total debited', value: token(done.amount + done.fee, 'SUI', { up: true }) },
            { label: 'Status', value: done.real ? 'Settled on Sui' : 'Confirmed (demo)' },
            { label: 'Transaction', value: shortAddr(done.digest, 8, 6) },
          ]}
          onDone={onExit}
        />
        {done.real && (
          <a className="tw-link" href={explorerTx(done.digest)} target="_blank" rel="noreferrer">
            View on Suiscan
          </a>
        )}
      </Screen>
    );
  }

  if (step === 'confirm' || step === 'sending') {
    const busy = step === 'sending';
    return (
      <Screen title="Confirm send" onBack={busy ? undefined : () => setStep('form')}>
        <div className="tw-hero">
          <SuiMark size={52} />
          <p className="tw-hero-amt">{token(value)}</p>
          <p className="tw-hero-sub">{fiat(value)}</p>
        </div>

        <div className="tw-details">
          <Detail label="From" value={`Main Wallet · ${shortAddr(address, 6, 4)}`} />
          <Detail label="To" value={named ? `${named.name} · ${shortAddr(to, 6, 4)}` : shortAddr(to, 8, 6)} />
          <Detail label="Network" value={live ? 'Sui Testnet' : 'Sui Testnet (demo)'} />
          <Detail label="Network fee" value={token(NETWORK_FEE_SUI)} />
          <Detail label="Max total" value={token(totalCost(value), 'SUI', { up: true })} strong />
          <Detail label="Balance after" value={token(round(limit - totalCost(value)))} />
        </div>

        {error && <p className="tw-error">{error}</p>}

        <button className="tw-btn" onClick={confirm} disabled={busy}>
          {busy ? <><span className="tw-spin" /> Sending</> : 'Confirm and send'}
        </button>
      </Screen>
    );
  }

  return (
    <Screen title="Send SUI" onBack={onExit}>
      <div className="tw-label">Recipient</div>
      <div className="tw-input-row">
        <input
          className="tw-input tw-mono"
          placeholder="Sui address (0x…)"
          spellCheck="false"
          autoComplete="off"
          value={to}
          onChange={(e) => setTo(e.target.value.trim())}
          aria-invalid={to.length > 0 && !addressOk}
        />
        <button className="tw-paste" onClick={() => navigator.clipboard?.readText?.().then(setTo).catch(() => {})}>
          Paste
        </button>
      </div>
      {to.length > 0 && !addressOk && (
        <p className="tw-bad tw-note">A Sui address is 66 characters and starts with 0x.</p>
      )}
      {named && <p className="tw-note tw-ok">Saved recipient · {named.name}</p>}

      {addressOk && !named && (
        <>
          <div className="tw-label">Save as</div>
          <input
            className="tw-input"
            placeholder="A name you will recognise (optional)"
            value={saveAs}
            onChange={(e) => setSaveAs(e.target.value)}
          />
          <p className="tw-note">Saved automatically once the transfer goes through.</p>
        </>
      )}

      <div className="tw-label tw-label--sp">Saved recipients</div>
      <div className="tw-list">
        {people.length === 0 && <p className="tw-empty">None yet — paste an address above.</p>}
        {people.map((c) => (
          <MethodRow
            key={c.address}
            mark={<span className="tw-initial">{c.name[0]}</span>}
            title={c.name}
            sub={shortAddr(c.address, 10, 8)}
            on={c.address === to}
            onClick={() => setTo(c.address)}
            right={<IcNext width={18} height={18} />}
          />
        ))}
      </div>

      <div className="tw-label tw-label--sp">Amount</div>
      <AmountField
        value={amount}
        onChange={setAmount}
        sub={value > 0 ? fiat(value) : `Available ${token(limit)}`}
        max={max}
        onMax={() => setAmount(String(max))}
        error={amountError}
      />

      {live && (
        <p className="tw-note">
          Live transfers spend your on-chain testnet balance, which is {token(spendable ?? 0)}.
        </p>
      )}

      {error && <p className="tw-error">{error}</p>}

      <button className="tw-btn" disabled={!canContinue} onClick={() => setStep('confirm')}>
        Continue
      </button>
    </Screen>
  );
}

/* ================================================================== */
/* Receive                                                             */
/* ================================================================== */

export function ReceiveScreen({ address, onExit }) {
  return (
    <Screen title="Receive SUI" onBack={onExit}>
      <div className="tw-qr-card">
        <div className="tw-qr"><QrBlock value={address} /></div>
        <p className="tw-qr-name">Main Wallet</p>
        <p className="tw-qr-net">Sui Network</p>
      </div>

      <CopyField label="Your address" value={address} lines />

      <p className="tw-warn">
        Send only SUI and Sui-network tokens to this address. Anything sent on another
        network will be lost.
      </p>

      <a className="tw-link" href={explorerAddr(address)} target="_blank" rel="noreferrer">
        View address on Suiscan
      </a>
    </Screen>
  );
}

/* ================================================================== */
/* Buy — the on-ramp, the way one actually works                       */
/* ================================================================== */

/**
 * A wallet does not sell you the coin. It shops the order to licensed
 * on-ramp providers, shows what each would deliver for the same cash, and
 * hands the payment off to whichever you pick. That is four decisions —
 * amount, provider, payment method, confirm — and collapsing them into one
 * screen is what made the earlier version read as a mock-up.
 */

const cardBrand = (number) => {
  const n = number.replace(/\D/g, '');
  if (n.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  return 'Card';
};

const groupCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

const QUICK_MYR = [100, 250, 500, 1000];

export function BuyFlow({ address, rails, prefill = null, onAddCard, onCommit, onExit }) {
  const [step, setStep] = useState('amount');   // amount | provider | pay | review | working | done | addcard
  const [spend, setSpend] = useState(prefill ? String(prefill) : '');
  const [providerId, setProviderId] = useState(null);
  const [railId, setRailId] = useState(rails[0]?.id ?? null);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(null);

  const value = Number(spend) || 0;
  const quotes = useMemo(() => buyQuotes({ myr: value || 500 }), [value]);
  const best = quotes[0];
  const provider = quotes.find((q) => q.id === providerId) ?? best;
  const rail = rails.find((r) => r.id === railId) ?? rails[0];

  const minimum = Math.min(...onrampProviders.map((p) => p.minMyr));
  const tooSmall = value > 0 && value < minimum;

  async function confirm() {
    setStep('working');
    // Identity, then payment, then delivery — the three things a real order
    // waits on, in the order it waits on them.
    for (const n of [1, 2, 3]) {
      await new Promise((r) => setTimeout(r, 900));
      setProgress(n);
    }
    const label = `${rail.brand} •••• ${rail.last4}`;
    const tx = onCommit({
      dir: 'in',
      kind: 'topup',
      asset: 'SUI',
      title: `Bought via ${provider.name}`,
      amount: provider.receives,
      handle: label,
      method: label,
      note: `${provider.name} order`,
      fiatMyr: value,               // what was actually charged, fee included
      fee: 0,                       // the provider's cut is billed in cash, not taken in SUI
    });
    setDone({ tx, provider, rail, spend: value });
    setStep('done');
  }

  if (step === 'addcard') {
    return <AddCard onCancel={() => setStep('pay')} onSave={(card) => { onAddCard(card); setRailId(card.id); setStep('pay'); }} />;
  }

  /* ---- 4. delivered ---- */
  if (step === 'done' && done) {
    return (
      <Screen title="Order complete">
        <Success
          title={`${done.provider.name} delivered your SUI`}
          amount={`+ ${token(done.tx.amount)}`}
          sub={`paid ${cash(done.spend)} with ${done.rail.brand} •••• ${done.rail.last4}`}
          details={[
            { label: 'Provider', value: done.provider.name },
            { label: 'Order ID', value: done.tx.digest.slice(0, 12).toUpperCase() },
            { label: 'Rate', value: `1 SUI = ${cash(done.provider.price)}` },
            { label: 'Provider fee', value: cash(done.provider.fee) },
            { label: 'Delivered to', value: shortAddr(address, 6, 6) },
          ]}
          onDone={onExit}
        />
      </Screen>
    );
  }

  /* ---- 3. paying ---- */
  if (step === 'working') {
    const stages = [
      `Identity verified with ${provider.name}`,
      `Payment authorised · ${rail.brand}`,
      'Delivering SUI to your wallet',
    ];
    return (
      <Screen title="Processing order">
        <div className="tw-hero">
          <SuiMark size={52} />
          <p className="tw-hero-amt">{cash(value)}</p>
          <p className="tw-hero-sub">with {provider.name}</p>
        </div>

        <div className="tw-stages">
          {stages.map((label, i) => (
            <div key={label} className={`tw-stage${i < progress ? ' on' : ''}${i === progress ? ' now' : ''}`}>
              <span className="tw-stage-dot">{i < progress ? <IcCheck width={12} height={12} /> : null}</span>
              {label}
            </div>
          ))}
        </div>

        <p className="tw-fine">Do not close this screen. Orders normally clear in {provider.eta}.</p>
      </Screen>
    );
  }

  /* ---- 2b. review ---- */
  if (step === 'review') {
    return (
      <Screen title="Review order" onBack={() => setStep('pay')}>
        <div className="tw-hero">
          <SuiMark size={52} />
          <p className="tw-hero-amt">{token(provider.receives)}</p>
          <p className="tw-hero-sub">for {cash(value)}</p>
        </div>

        <div className="tw-details">
          <Detail label="Provider" value={provider.name} />
          <Detail label="Pay with" value={`${rail.brand} •••• ${rail.last4}`} />
          <Detail label="Rate" value={`1 SUI = ${cash(provider.price)}`} />
          <Detail label="Amount" value={cash(value - provider.fee)} />
          <Detail label={`${provider.name} fee (${(provider.feeRate * 100).toFixed(2)}%)`} value={cash(provider.fee)} />
          <Detail label="Total charged" value={cash(value)} strong />
          <Detail label="You receive" value={token(provider.receives)} strong />
          <Detail label="Delivered to" value={shortAddr(address, 6, 6)} />
          <Detail label="Arrives" value={provider.eta} />
        </div>

        <button className="tw-btn" onClick={confirm}>Confirm and pay {cash(value)}</button>
        <p className="tw-fine">
          The order is carried out by {provider.name}, not by Mizan, under its own terms and
          identity checks. Demo purchase — no card is charged and no money moves.
        </p>
      </Screen>
    );
  }

  /* ---- 2a. payment method ---- */
  if (step === 'pay') {
    return (
      <Screen title="Pay with" onBack={() => setStep('provider')}>
        <p className="tw-note">{provider.name} accepts these in Malaysia.</p>

        <div className="tw-list">
          {rails.map((r) => (
            <MethodRow
              key={r.id}
              mark={r.kind === 'card' ? <IcCard width={18} height={18} /> : <RailMark rail={r} size={34} />}
              title={r.kind === 'card' ? `${r.brand} •••• ${r.last4}` : r.brand}
              sub={r.sub}
              on={r.id === rail?.id}
              onClick={() => setRailId(r.id)}
            />
          ))}
          <MethodRow
            mark={<span className="tw-initial">+</span>}
            title="Add debit or credit card"
            sub="Visa, Mastercard, Amex"
            onClick={() => setStep('addcard')}
            right={<IcNext width={18} height={18} />}
          />
        </div>

        <button className="tw-btn" disabled={!rail} onClick={() => setStep('review')}>Continue</button>
      </Screen>
    );
  }

  /* ---- 1b. provider comparison ---- */
  if (step === 'provider') {
    return (
      <Screen title="Choose a provider" onBack={() => setStep('amount')}>
        <p className="tw-note">Same {cash(value)}, three quotes. Fees and spreads differ, so the amount of SUI does too.</p>

        <div className="tw-list">
          {quotes.map((q, i) => (
            <button
              key={q.id}
              className={`tw-quote${q.id === provider.id ? ' on' : ''}`}
              onClick={() => setProviderId(q.id)}
              disabled={q.belowMinimum}
              aria-pressed={q.id === provider.id}
            >
              <ProviderMark name={q.name} size={34} />
              <span className="tw-quote-body">
                <span className="tw-quote-t">
                  {q.name}
                  {i === 0 && !q.belowMinimum && <span className="tw-badge">Best rate</span>}
                </span>
                <span className="tw-quote-s">
                  {q.belowMinimum
                    ? `Minimum ${cash(q.minMyr)}`
                    : `Fee ${cash(q.fee)} · ${q.eta}`}
                </span>
              </span>
              <span className="tw-quote-amt">
                <span>{token(q.receives)}</span>
                <span className="tw-quote-rate">at {cash(q.price)}</span>
              </span>
            </button>
          ))}
        </div>

        <button className="tw-btn" disabled={provider.belowMinimum} onClick={() => setStep('pay')}>
          Continue with {provider.name}
        </button>
      </Screen>
    );
  }

  /* ---- 1a. amount ---- */
  return (
    <Screen title="Buy SUI" onBack={onExit}>
      {/* Fiat first: you decide what to spend, not what to receive — the
          provider's rate settles the rest. */}
      <AmountField
        value={spend}
        onChange={setSpend}
        unit="RM"
        sub={value > 0 ? `≈ ${token(best.receives)} after fees` : `1 SUI = ${cash(rateMyr('SUI'))}`}
        error={tooSmall ? `The smallest order any provider takes is ${cash(minimum)}.` : null}
        autoFocus
      />

      <div className="tw-quick">
        {QUICK_MYR.map((q) => (
          <button key={q} className={`tw-chip${value === q ? ' on' : ''}`} onClick={() => setSpend(String(q))}>
            {cash(q).replace('.00', '')}
          </button>
        ))}
      </div>

      <div className="tw-details" style={{ marginTop: 24 }}>
        <Detail label="Best quote" value={value > 0 ? `${best.name} · ${token(best.receives)}` : '—'} />
        <Detail label="Delivered to" value={shortAddr(address, 6, 6)} />
      </div>

      <button className="tw-btn" disabled={value <= 0 || tooSmall} onClick={() => setStep('provider')}>
        Compare providers
      </button>
    </Screen>
  );
}

function AddCard({ onSave, onCancel }) {
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [holder, setHolder] = useState('');
  const [error, setError] = useState(null);

  const digits = number.replace(/\D/g, '');
  const expOk = /^(0[1-9]|1[0-2])\/\d{2}$/.test(exp);
  const ready = digits.length >= 15 && expOk && cvc.length >= 3 && holder.trim().length > 1;

  function save() {
    if (!ready) {
      setError('Check the card number, expiry and security code.');
      return;
    }
    onSave({
      id: `k${Date.now().toString(36)}`,
      kind: 'card',
      brand: cardBrand(number),
      last4: digits.slice(-4),
      exp,
      sub: `Expires ${exp}`,
      eta: 'Instant',
      holder: holder.trim().toUpperCase(),
    });
  }

  return (
    <Screen title="Add card" onBack={onCancel}>
      <div className="tw-cardface">
        <span className="tw-cardface-brand">{digits ? cardBrand(number) : 'Card'}</span>
        <span className="tw-cardface-num tw-mono">{number || '•••• •••• •••• ••••'}</span>
        <span className="tw-cardface-foot">
          <span>{holder.toUpperCase() || 'CARD HOLDER'}</span>
          <span>{exp || 'MM/YY'}</span>
        </span>
      </div>

      <div className="tw-label">Card number</div>
      <input
        className="tw-input tw-mono"
        inputMode="numeric"
        placeholder="4242 4242 4242 4242"
        value={number}
        onChange={(e) => { setNumber(groupCard(e.target.value)); setError(null); }}
        autoFocus
      />

      <div className="tw-pair">
        <div>
          <div className="tw-label">Expiry</div>
          <input
            className="tw-input tw-mono"
            inputMode="numeric"
            placeholder="MM/YY"
            value={exp}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 4);
              setExp(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
              setError(null);
            }}
          />
        </div>
        <div>
          <div className="tw-label">CVC</div>
          <input
            className="tw-input tw-mono"
            inputMode="numeric"
            placeholder="123"
            value={cvc}
            onChange={(e) => { setCvc(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null); }}
          />
        </div>
      </div>

      <div className="tw-label">Name on card</div>
      <input
        className="tw-input"
        placeholder="EYA HIA"
        value={holder}
        onChange={(e) => { setHolder(e.target.value); setError(null); }}
      />

      {error && <p className="tw-error">{error}</p>}

      <button className="tw-btn" disabled={!ready} onClick={save}>Save card</button>
      <p className="tw-fine">
        Demo form. Card details stay in this browser tab and are never sent anywhere —
        do not type a real card number.
      </p>
    </Screen>
  );
}

/* ================================================================== */
/* Swap                                                                */
/* ================================================================== */

/**
 * SUI to USDT and back, through a pool. This is a screen in its own right and
 * it is also step one of cashing out, because there is no route from SUI
 * straight to a bank account — the stablecoin is what an off-ramp can price.
 */
export function SwapFlow({ balances, prefill = null, onCommit, onExit, onDone }) {
  const [from, setFrom] = useState('SUI');
  const [amount, setAmount] = useState(prefill ? String(prefill) : '');
  const [step, setStep] = useState('form');     // form | confirm | working | done
  const [result, setResult] = useState(null);

  const to = from === 'SUI' ? 'USDT' : 'SUI';
  const held = balances[from] ?? 0;
  const value = Number(amount) || 0;
  const quote = useMemo(() => swapQuote({ from, to, amount: value }), [from, to, value]);

  // Gas is always paid in SUI, so swapping SUI must leave enough behind for it.
  const max = from === 'SUI' ? sendableFrom(held) : round(held);
  const error =
    !amount ? null
    : value <= 0 ? 'Enter an amount greater than zero.'
    : value > max ? `You can swap at most ${token(max, from)}.`
    : null;

  async function confirm() {
    setStep('working');
    await new Promise((r) => setTimeout(r, 1600));
    const tx = onCommit({
      dir: 'out',
      kind: 'swap',
      asset: from,
      title: `Swap ${from} to ${to}`,
      amount: value,
      handle: quote.route,
      method: quote.route,
      fee: NETWORK_FEE_SUI,
      got: { asset: to, amount: quote.out },
    });
    setResult({ tx, quote });
    setStep('done');
  }

  if (step === 'done' && result) {
    return (
      <Screen title="Swapped">
        <Success
          title="Swap complete"
          amount={`${token(result.quote.out, to)}`}
          sub={`from ${token(result.quote.amount, from)} · ${quote.route}`}
          details={[
            { label: 'Rate', value: `1 ${from} = ${round(result.quote.rate, 4)} ${to}` },
            { label: 'Price impact', value: `${(result.quote.priceImpact * 100).toFixed(2)}%` },
            { label: 'Pool fee', value: token(result.quote.poolFee, from) },
            { label: 'Network fee', value: token(NETWORK_FEE_SUI) },
          ]}
          doneLabel={onDone ? 'Continue' : 'Done'}
          onDone={() => (onDone ? onDone(result) : onExit())}
        />
      </Screen>
    );
  }

  if (step === 'confirm' || step === 'working') {
    const busy = step === 'working';
    return (
      <Screen title="Confirm swap" onBack={busy ? undefined : () => setStep('form')}>
        <div className="tw-hero">
          <AssetMark asset={to} size={52} />
          <p className="tw-hero-amt">{token(quote.out, to)}</p>
          <p className="tw-hero-sub">for {token(value, from)}</p>
        </div>

        <div className="tw-details">
          <Detail label="Route" value={quote.route} />
          <Detail label="Rate" value={`1 ${from} = ${round(quote.rate, 4)} ${to}`} />
          <Detail label={`Pool fee (${(POOL_FEE_RATE * 100).toFixed(1)}%)`} value={token(quote.poolFee, from)} />
          <Detail label="Price impact" value={`${(quote.priceImpact * 100).toFixed(2)}%`} />
          <Detail label="Slippage tolerance" value={`${(quote.slippage * 100).toFixed(1)}%`} />
          <Detail label="Network fee" value={token(NETWORK_FEE_SUI)} />
          <Detail label="Minimum received" value={token(quote.minReceived, to)} strong />
        </div>

        <button className="tw-btn" onClick={confirm} disabled={busy}>
          {busy ? <><span className="tw-spin" /> Swapping</> : 'Confirm swap'}
        </button>
      </Screen>
    );
  }

  return (
    <Screen title="Swap" onBack={onExit}>
      <div className="tw-leg">
        <div className="tw-leg-head">
          <span className="tw-label">You pay</span>
          <span className="tw-leg-bal">Balance {token(held, from)}</span>
        </div>
        <div className="tw-leg-body">
          <AssetMark asset={from} size={34} />
          <span className="tw-leg-sym">{from}</span>
          <input
            className="tw-leg-input"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
            aria-label={`Amount in ${from}`}
            autoFocus
          />
          <button className="tw-max" onClick={() => setAmount(String(max))}>Max</button>
        </div>
      </div>

      <div className="tw-leg-swap">
        <button className="tw-icon-btn" onClick={() => { setFrom(to); setAmount(''); }} aria-label="Swap direction">
          <IcSwap width={20} height={20} />
        </button>
      </div>

      <div className="tw-leg">
        <div className="tw-leg-head">
          <span className="tw-label">You receive</span>
          <span className="tw-leg-bal">Balance {token(balances[to] ?? 0, to)}</span>
        </div>
        <div className="tw-leg-body">
          <AssetMark asset={to} size={34} />
          <span className="tw-leg-sym">{to}</span>
          <span className="tw-leg-out">{value > 0 ? token(quote.out, to, { bare: true }) : '0'}</span>
        </div>
      </div>

      {error && <p className="tw-error">{error}</p>}

      <div className="tw-details" style={{ marginTop: 24 }}>
        <Detail label="Route" value={quote.route} />
        <Detail label="Rate" value={`1 ${from} = ${round(quote.rate, 4)} ${to}`} />
        <Detail label="Price impact" value={`${(quote.priceImpact * 100).toFixed(2)}%`} />
      </div>

      <button className="tw-btn" disabled={value <= 0 || !!error} onClick={() => setStep('confirm')}>
        Review swap
      </button>
    </Screen>
  );
}

/* ================================================================== */
/* Sell — swap to a stablecoin, then off-ramp it to ringgit            */
/* ================================================================== */

/**
 * The real procedure, in the order it really happens:
 *
 *   1. SUI is swapped on chain for USDT. Nothing has left the wallet yet.
 *   2. The USDT is sold to an off-ramp, which pays ringgit into a Touch 'n Go
 *      wallet or a bank account.
 *
 * Two steps, two fees, two entries in the history — because that is what it
 * costs, and a single "sell" button hides the half of it that is not free.
 */
export function SellFlow({ balances, rails = payoutRails, onCommit, onExit }) {
  const [phase, setPhase] = useState('choose');  // choose | swap | payout | review | working | done
  const [usdt, setUsdt] = useState('');
  const [railId, setRailId] = useState(rails[0]?.id ?? null);
  const [swapped, setSwapped] = useState(null);
  const [done, setDone] = useState(null);

  const rail = rails.find((r) => r.id === railId) ?? rails[0];
  const held = balances.USDT ?? 0;
  const value = Number(usdt) || 0;
  const quote = useMemo(() => payoutQuote({ usdt: value, rail }), [value, rail]);

  const error =
    !usdt ? null
    : value <= 0 ? 'Enter an amount greater than zero.'
    : value > held ? `You hold ${token(held, 'USDT')}.`
    : quote.belowMinimum ? `${rail.brand} pays out from ${cash(rail.min)}.`
    : quote.aboveMaximum ? `${rail.brand} takes at most ${cash(rail.max)} per payout.`
    : null;

  async function confirm() {
    setPhase('working');
    await new Promise((r) => setTimeout(r, 1700));
    const label = `${rail.brand} •••• ${rail.last4}`;
    const tx = onCommit({
      dir: 'out',
      kind: 'cashout',
      asset: 'USDT',
      title: `Cash out to ${rail.short}`,
      amount: value,
      handle: label,
      method: label,
      note: `Payout ${cash(quote.receiveMyr)}`,
      fiatMyr: quote.receiveMyr,    // what lands in the account, not the gross
      fee: quote.feeUsdt,
    });
    setDone({ tx, rail, quote });
    setPhase('done');
  }

  /* ---- finished ---- */
  if (phase === 'done' && done) {
    return (
      <Screen title="Payout placed">
        <Success
          title={`On its way to ${done.rail.brand}`}
          amount={cash(done.quote.receiveMyr)}
          sub={`${token(done.tx.amount, 'USDT')} sold · •••• ${done.rail.last4}`}
          details={[
            { label: 'Rate', value: `1 USDT = ${cash(done.quote.rate)}` },
            { label: 'Off-ramp fee', value: cash(done.quote.feeMyr) },
            { label: 'Reference', value: done.tx.digest.slice(0, 12).toUpperCase() },
            { label: 'Arrives', value: done.rail.eta, strong: true },
          ]}
          onDone={onExit}
        />
        {swapped && (
          <p className="tw-fine">
            This cash-out took two steps: {token(swapped.quote.amount)} swapped for
            {' '}{token(swapped.quote.out, 'USDT')}, then sold for ringgit. Both are in your history.
          </p>
        )}
      </Screen>
    );
  }

  /* ---- step 2, confirming ---- */
  if (phase === 'review' || phase === 'working') {
    const busy = phase === 'working';
    return (
      <Screen title="Review payout" onBack={busy ? undefined : () => setPhase('payout')}>
        <div className="tw-hero">
          <RailMark rail={rail} size={52} />
          <p className="tw-hero-amt">{cash(quote.receiveMyr)}</p>
          <p className="tw-hero-sub">to {rail.brand} •••• {rail.last4}</p>
        </div>

        <div className="tw-details">
          <Detail label="You sell" value={token(value, 'USDT')} />
          <Detail label="Rate" value={`1 USDT = ${cash(quote.rate)}`} />
          <Detail label="Gross" value={cash(quote.grossMyr)} />
          <Detail label={`Off-ramp fee (${(OFFRAMP_FEE_RATE * 100).toFixed(1)}% + ${cash(OFFRAMP_FLAT_MYR)})`} value={cash(quote.feeMyr)} />
          <Detail label="You receive" value={cash(quote.receiveMyr)} strong />
          <Detail label="Arrives" value={rail.eta} />
        </div>

        <button className="tw-btn" onClick={confirm} disabled={busy}>
          {busy ? <><span className="tw-spin" /> Placing payout</> : `Sell for ${cash(quote.receiveMyr)}`}
        </button>
        <p className="tw-fine">
          Demo payout. Nothing is sold and no ringgit moves. A real off-ramp is a licensed
          money-services business and would verify your identity before paying out.
        </p>
      </Screen>
    );
  }

  /* ---- step 2, amount and destination ---- */
  if (phase === 'payout') {
    return (
      <Screen title="Step 2 · Cash out USDT" onBack={() => setPhase('choose')}>
        <p className="tw-steps-note">Step 2 of 2 — the stablecoin is what an off-ramp can price in ringgit.</p>

        <AmountField
          value={usdt}
          onChange={setUsdt}
          unit="USDT"
          sub={value > 0 ? `You receive ${cash(quote.receiveMyr)}` : `Holding ${token(held, 'USDT')}`}
          max={round(held)}
          onMax={() => setUsdt(String(round(held)))}
          error={error}
          autoFocus
        />

        <div className="tw-label tw-label--sp">Pay out to</div>
        <div className="tw-list">
          {rails.map((r) => (
            <MethodRow
              key={r.id}
              mark={<RailMark rail={r} size={34} />}
              title={r.brand}
              sub={`${r.sub} · ${r.etaShort}`}
              on={r.id === rail?.id}
              onClick={() => setRailId(r.id)}
            />
          ))}
        </div>

        <div className="tw-details">
          <Detail label="Gross" value={cash(quote.grossMyr)} />
          <Detail label="Off-ramp fee" value={cash(quote.feeMyr)} />
          <Detail label="You receive" value={cash(quote.receiveMyr)} strong />
        </div>

        <button className="tw-btn" disabled={value <= 0 || !!error} onClick={() => setPhase('review')}>
          Continue
        </button>
      </Screen>
    );
  }

  /* ---- step 1, or skip it ---- */
  if (phase === 'swap') {
    return (
      <SwapFlow
        balances={balances}
        onCommit={onCommit}
        onExit={() => setPhase('choose')}
        onDone={(r) => {
          setSwapped(r);
          setUsdt(String(r.quote.out));
          setPhase('payout');
        }}
      />
    );
  }

  return (
    <Screen title="Sell SUI" onBack={onExit}>
      <p className="tw-steps-note">
        There is no route from SUI straight to a bank account. It goes in two steps, and
        this is both of them.
      </p>

      <ol className="tw-route">
        <li>
          <span className="tw-route-n">1</span>
          <span className="tw-route-b">
            <span className="tw-route-t">Swap SUI for USDT</span>
            <span className="tw-route-s">On chain, through {SWAP_ROUTE}. Holding {token(balances.SUI ?? 0)}.</span>
          </span>
          <AssetMark asset="USDT" size={30} />
        </li>
        <li>
          <span className="tw-route-n">2</span>
          <span className="tw-route-b">
            <span className="tw-route-t">Cash out USDT to ringgit</span>
            <span className="tw-route-s">Paid into Touch 'n Go or CIMB. Holding {token(held, 'USDT')}.</span>
          </span>
          <RailMark rail={rails[0]} size={30} />
        </li>
      </ol>

      <button className="tw-btn" onClick={() => setPhase('swap')}>Start with the swap</button>
      <button className="tw-btn ghost" disabled={held <= 0} onClick={() => setPhase('payout')}>
        {held > 0 ? `Skip — cash out my ${token(held, 'USDT')}` : 'No USDT to cash out yet'}
      </button>
    </Screen>
  );
}

/* ================================================================== */
/* History                                                             */
/* ================================================================== */

export function HistoryScreen({ txs, onOpen, onExit }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const t of byNewest(txs)) {
      const key = monthKey(t.ts);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return [...map.entries()];
  }, [txs]);

  return (
    <Screen title="History" onBack={onExit}>
      {groups.length === 0 && <p className="tw-empty">No transactions yet.</p>}

      {groups.map(([key, items]) => (
        <section key={key}>
          <div className="tw-month">{monthLabel(key)} {key.slice(0, 4)}</div>
          <div className="tw-list">
            {items.map((t) => <TxRow key={t.id} tx={t} onOpen={onOpen} />)}
          </div>
        </section>
      ))}
    </Screen>
  );
}

export function TxRow({ tx, onOpen }) {
  const incoming = tx.dir === 'in';
  const isSwap = tx.kind === 'swap';
  const sign = isSwap ? '−' : incoming ? '+' : '−';
  return (
    <button className="tw-tx" onClick={() => onOpen?.(tx)}>
      <span className={`tw-tx-icon ${isSwap ? 'swap' : tx.dir}`} aria-hidden="true">
        {isSwap ? <IcSwap width={18} height={18} /> : incoming ? <IcReceive width={18} height={18} /> : <IcSend width={18} height={18} />}
      </span>
      <span className="tw-tx-body">
        <span className="tw-tx-t">{tx.title}</span>
        <span className="tw-tx-s">{whenLabel(tx.ts)}</span>
      </span>
      <span className="tw-tx-amt">
        <span className={incoming ? 'in' : 'out'}>{sign}{token(tx.amount, tx.asset)}</span>
        <span className="tw-tx-fiat">
          {tx.got ? `→ ${token(tx.got.amount, tx.got.asset)}` : tx.fiatMyr != null ? cash(tx.fiatMyr) : fiat(tx.amount, tx.asset)}
        </span>
      </span>
    </button>
  );
}

export function TxDetail({ tx, onExit }) {
  const incoming = tx.dir === 'in';
  const isSwap = tx.kind === 'swap';
  const KIND = { transfer: 'Transfer', topup: 'Purchase', cashout: 'Cash out', swap: 'Swap', request: 'Request' };

  return (
    <Screen title={KIND[tx.kind] ?? 'Transaction'} onBack={onExit}>
      <div className="tw-hero">
        <span className={`tw-tx-icon big ${isSwap ? 'swap' : tx.dir}`} aria-hidden="true">
          {isSwap ? <IcSwap width={26} height={26} /> : incoming ? <IcReceive width={26} height={26} /> : <IcSend width={26} height={26} />}
        </span>
        <p className="tw-hero-amt">
          {isSwap ? token(tx.got.amount, tx.got.asset) : `${incoming ? '+' : '−'}${token(tx.amount, tx.asset)}`}
        </p>
        <p className="tw-hero-sub">
          {isSwap ? `for ${token(tx.amount, tx.asset)}` : fiat(tx.amount, tx.asset)}
        </p>
      </div>

      <div className="tw-details">
        <Detail label={isSwap ? 'Route' : incoming ? 'From' : 'To'} value={isSwap ? tx.handle : tx.title} />
        {!isSwap && tx.handle && <Detail label="Account" value={tx.handle} />}
        <Detail label="Date" value={whenLabel(tx.ts)} />
        <Detail label={isSwap ? 'Sold' : 'Amount'} value={token(tx.amount, tx.asset)} />
        {tx.got && <Detail label="Received" value={token(tx.got.amount, tx.got.asset)} />}
        {tx.note && <Detail label="Note" value={tx.note} />}
        <Detail label={feeOnTop(tx) ? 'Network fee' : 'Fee'} value={token(tx.fee, tx.asset)} />
        <Detail
          label={incoming ? 'Credited' : 'Debited'}
          value={token(incoming ? tx.amount : tx.amount + (feeOnTop(tx) ? tx.fee : 0), tx.asset, { up: !incoming })}
          strong
        />
        <Detail label="Network" value="Sui" />
        <Detail label="Status" value={tx.pending ? 'Awaiting payment' : tx.real ? 'Settled on chain' : 'Completed (demo)'} />
      </div>

      {tx.digest && <CopyField label="Transaction hash" value={tx.digest} lines />}

      {tx.real && (
        <a className="tw-link" href={explorerTx(tx.digest)} target="_blank" rel="noreferrer">
          View on Suiscan
        </a>
      )}
    </Screen>
  );
}

/* ================================================================== */
/* Settings                                                            */
/* ================================================================== */

export function SettingsScreen({ profile, address, live, setLive, currency, onCurrency, onExit, onSignOut }) {
  const [reveal, setReveal] = useState(false);

  return (
    <Screen title="Settings" onBack={onExit}>
      <div className="tw-profile">
        <span className="tw-avatar">{profile.name?.[0]?.toUpperCase() ?? '?'}</span>
        <span>
          <span className="tw-profile-n">{profile.name}</span>
          <span className="tw-profile-e">{profile.email || 'Signed in with Google'}</span>
        </span>
      </div>

      <CopyField label="Wallet address" value={address} lines />

      <div className="tw-details">
        <Detail label="Wallet" value="Main Wallet" />
        <Detail label="Network" value="Sui Testnet" />
        <Detail label="Holdings" value="SUI · USDT" />
        <Detail label="Derivation" value="From your Google account" />
      </div>

      <div className="tw-toggle" role="group">
        <span className="tw-method-mark"><IcGlobe width={20} height={20} /></span>
        <span className="tw-method-body">
          <span className="tw-method-t">Display currency</span>
          <span className="tw-method-s">{CURRENCIES[currency]?.name ?? currency}</span>
        </span>
        <CurrencyPicker value={currency} onChange={onCurrency} />
      </div>

      <button className="tw-toggle" role="switch" aria-checked={live} onClick={() => setLive(!live)}>
        <span className="tw-method-mark"><IcShield width={20} height={20} /></span>
        <span className="tw-method-body">
          <span className="tw-method-t">Live transfers</span>
          <span className="tw-method-s">{live ? 'Signing real Sui testnet transactions' : 'Demo transactions only'}</span>
        </span>
        <span className="tw-switch" data-on={String(live)} aria-hidden="true"><span /></span>
      </button>

      <button className="tw-toggle" onClick={() => setReveal((r) => !r)}>
        <span className="tw-method-mark"><IcEye width={20} height={20} /></span>
        <span className="tw-method-body">
          <span className="tw-method-t">Secret recovery</span>
          <span className="tw-method-s">{reveal ? 'Tap to hide' : 'Where your key comes from'}</span>
        </span>
      </button>

      {reveal && (
        <p className="tw-warn">
          This wallet has no recovery phrase to write down. The key is derived from your
          Google account, so signing in with the same account on any device rebuilds the
          same address. That stands in for zkLogin, which proves the same thing without
          the key ever existing in the browser.
        </p>
      )}

      <a className="tw-link" href={explorerAddr(address)} target="_blank" rel="noreferrer">
        View on Suiscan
      </a>

      <button className="tw-btn ghost" onClick={onSignOut}>Close wallet</button>
      <p className="tw-fine">Mizan Wallet · demo build · Sui testnet</p>
    </Screen>
  );
}
