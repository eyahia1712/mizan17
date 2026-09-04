import { useState, useMemo } from 'react';
import { seedBanks, BUY_FEE_RATE, SELL_FEE_RATE } from '../../data/mockData.js';
import { sui, myr, shortAddr, explorerTx, explorerAddr } from '../../lib/format.js';
import { checkAmount, sendableFrom, totalCost, round, NETWORK_FEE_SUI, whenLabel, byNewest, monthKey, monthLabel } from '../../lib/ledger.js';
import { isValidSuiAddress, sendSui } from '../../lib/sui.js';
import { loadRecipients, saveRecipient, findRecipient } from '../../lib/recipients.js';
import {
  Screen, Detail, CopyField, AmountField, MethodRow, Success, QrBlock,
  IcSend, IcReceive, IcCard, IcBank, IcNext, IcShield, IcEye, SuiMark,
} from './WalletUI.jsx';

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
          amount={`− ${sui(done.sui)}`}
          sub={`to ${done.title} · ${myr(done.sui)}`}
          details={[
            { label: 'Network fee', value: sui(done.fee) },
            { label: 'Total debited', value: sui(done.sui + done.fee) },
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
          <p className="tw-hero-amt">{sui(value)}</p>
          <p className="tw-hero-sub">{myr(value)}</p>
        </div>

        <div className="tw-details">
          <Detail label="From" value={`Main Wallet · ${shortAddr(address, 6, 4)}`} />
          <Detail label="To" value={named ? `${named.name} · ${shortAddr(to, 6, 4)}` : shortAddr(to, 8, 6)} />
          <Detail label="Network" value={live ? 'Sui Testnet' : 'Sui Testnet (demo)'} />
          <Detail label="Network fee" value={sui(NETWORK_FEE_SUI)} />
          <Detail label="Max total" value={sui(totalCost(value))} strong />
          <Detail label="Balance after" value={sui(round(limit - totalCost(value)))} />
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
        sub={value > 0 ? myr(value) : `Available ${sui(limit)}`}
        max={max}
        onMax={() => setAmount(String(max))}
        error={amountError}
      />

      {live && (
        <p className="tw-note">
          Live transfers spend your on-chain testnet balance, which is {sui(spendable ?? 0)}.
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
/* Buy — the on-ramp, from a card or a bank account                    */
/* ================================================================== */

const cardBrand = (number) => {
  const n = number.replace(/\D/g, '');
  if (n.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  return 'Card';
};

const groupCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

export function BuyFlow({ balance, sources, onAddCard, onCommit, onExit }) {
  const [step, setStep] = useState('form');     // form | addcard | confirm | working | done
  const [amount, setAmount] = useState('');
  const [pick, setPick] = useState(sources[0]?.id ?? null);
  const [done, setDone] = useState(null);

  const value = Number(amount) || 0;
  const method = sources.find((s) => s.id === pick) ?? sources[0];

  const fee = round(value * BUY_FEE_RATE);
  const tooSmall = value > 0 && value < 0.5;

  async function confirm() {
    setStep('working');
    await new Promise((r) => setTimeout(r, 1600));
    const label = `${method.brand} •••• ${method.last4}`;
    const tx = onCommit({
      dir: 'in',
      kind: 'topup',
      title: method.kind === 'card' ? 'Card top-up' : 'Bank top-up',
      sui: value,
      handle: label,
      method: label,
      fee,                       // charged in ringgit; carried in SUI so every fee totals in one unit
    });
    setDone({ tx, label });
    setStep('done');
  }

  if (step === 'addcard') {
    return <AddCard onCancel={() => setStep('form')} onSave={(card) => { onAddCard(card); setPick(card.id); setStep('form'); }} />;
  }

  if (step === 'done' && done) {
    return (
      <Screen title="Purchase complete">
        <Success
          title="SUI added to your wallet"
          amount={`+ ${sui(done.tx.sui)}`}
          sub={`paid ${myr((done.tx.sui + done.tx.fee))} with ${done.label}`}
          details={[
            { label: 'Rate', value: `1 SUI = ${myr(1)}` },
            { label: 'Processing fee', value: `${(BUY_FEE_RATE * 100).toFixed(1)}% · ${sui(done.tx.fee)}` },
            { label: 'New balance', value: sui(balance), strong: true },
          ]}
          onDone={onExit}
        />
      </Screen>
    );
  }

  if (step === 'confirm' || step === 'working') {
    const busy = step === 'working';
    return (
      <Screen title="Confirm purchase" onBack={busy ? undefined : () => setStep('form')}>
        <div className="tw-hero">
          <SuiMark size={52} />
          <p className="tw-hero-amt">+ {sui(value)}</p>
          <p className="tw-hero-sub">for {myr(value + fee)}</p>
        </div>

        <div className="tw-details">
          <Detail label="Pay with" value={`${method.brand} •••• ${method.last4}`} />
          <Detail label="Rate" value={`1 SUI = ${myr(1)}`} />
          <Detail label="Amount" value={myr(value)} />
          <Detail label={`Fee (${(BUY_FEE_RATE * 100).toFixed(1)}%)`} value={myr(fee)} />
          <Detail label="Total charged" value={myr(value + fee)} strong />
          <Detail label="You receive" value={sui(value)} strong />
        </div>

        <button className="tw-btn" onClick={confirm} disabled={busy}>
          {busy ? <><span className="tw-spin" /> Processing payment</> : `Pay ${myr(value + fee)}`}
        </button>
        <p className="tw-fine">Demo purchase. No card is charged and no money moves.</p>
      </Screen>
    );
  }

  return (
    <Screen title="Buy SUI" onBack={onExit}>
      <AmountField
        value={amount}
        onChange={setAmount}
        sub={value > 0 ? `Costs ${myr(value + fee)}` : `1 SUI = ${myr(1)}`}
        error={tooSmall ? 'The minimum purchase is 0.5 SUI.' : null}
        autoFocus
      />

      <div className="tw-quick">
        {[10, 25, 50, 100].map((q) => (
          <button key={q} className={`tw-chip${value === q ? ' on' : ''}`} onClick={() => setAmount(String(q))}>
            {q} SUI
          </button>
        ))}
      </div>

      <div className="tw-label tw-label--sp">Pay with</div>
      <div className="tw-list">
        {sources.map((s) => (
          <MethodRow
            key={s.id}
            mark={s.kind === 'card' ? <IcCard width={20} height={20} /> : <IcBank width={20} height={20} />}
            title={`${s.brand} •••• ${s.last4}`}
            sub={s.kind === 'card' ? `Expires ${s.exp}` : s.sub}
            on={s.id === pick}
            onClick={() => setPick(s.id)}
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

      <button className="tw-btn" disabled={value <= 0 || tooSmall || !method} onClick={() => setStep('confirm')}>
        Continue
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
/* Sell — the off-ramp, out to a bank account                          */
/* ================================================================== */

export function SellFlow({ balance, banks = seedBanks, onCommit, onExit }) {
  const [step, setStep] = useState('form');
  const [amount, setAmount] = useState('');
  const [pick, setPick] = useState(banks[0]?.id ?? null);
  const [done, setDone] = useState(null);

  const value = Number(amount) || 0;
  const bank = banks.find((b) => b.id === pick) ?? banks[0];
  const fee = round(value * SELL_FEE_RATE);
  const proceeds = Math.max(0, value - fee);

  // No network fee here: the fee comes out of the proceeds, so the balance
  // only ever loses the amount actually sold.
  const amountError =
    !amount ? null
    : value <= 0 ? 'Enter an amount greater than zero.'
    : value > balance ? `You only have ${sui(balance)}.`
    : null;

  async function confirm() {
    setStep('working');
    await new Promise((r) => setTimeout(r, 1600));
    const label = `${bank.brand} •••• ${bank.last4}`;
    const tx = onCommit({
      dir: 'out',
      kind: 'cashout',
      title: 'Cash out',
      sui: value,
      handle: label,
      method: label,
      fee,
    });
    setDone({ tx, label, proceeds });
    setStep('done');
  }

  if (step === 'done' && done) {
    return (
      <Screen title="Withdrawal placed">
        <Success
          title="On its way to your bank"
          amount={myr(done.proceeds)}
          sub={`${sui(done.tx.sui)} sold · ${done.label}`}
          details={[
            { label: 'Rate', value: `1 SUI = ${myr(1)}` },
            { label: `Fee (${(SELL_FEE_RATE * 100).toFixed(1)}%)`, value: sui(done.tx.fee) },
            { label: 'Arrives', value: '1–2 business days' },
            { label: 'New balance', value: sui(balance), strong: true },
          ]}
          onDone={onExit}
        />
      </Screen>
    );
  }

  if (step === 'confirm' || step === 'working') {
    const busy = step === 'working';
    return (
      <Screen title="Confirm withdrawal" onBack={busy ? undefined : () => setStep('form')}>
        <div className="tw-hero">
          <SuiMark size={52} />
          <p className="tw-hero-amt">− {sui(value)}</p>
          <p className="tw-hero-sub">you receive {myr(proceeds)}</p>
        </div>

        <div className="tw-details">
          <Detail label="To" value={`${bank.brand} •••• ${bank.last4}`} />
          <Detail label="Rate" value={`1 SUI = ${myr(1)}`} />
          <Detail label="Amount sold" value={sui(value)} />
          <Detail label={`Fee (${(SELL_FEE_RATE * 100).toFixed(1)}%)`} value={sui(fee)} />
          <Detail label="You receive" value={myr(proceeds)} strong />
          <Detail label="Arrives" value="1–2 business days" />
        </div>

        <button className="tw-btn" onClick={confirm} disabled={busy}>
          {busy ? <><span className="tw-spin" /> Placing withdrawal</> : 'Confirm withdrawal'}
        </button>
      </Screen>
    );
  }

  return (
    <Screen title="Sell SUI" onBack={onExit}>
      <AmountField
        value={amount}
        onChange={setAmount}
        sub={value > 0 ? `You receive ${myr(proceeds)}` : `Available ${sui(balance)}`}
        max={round(balance)}
        onMax={() => setAmount(String(round(balance)))}
        error={amountError}
        autoFocus
      />

      <div className="tw-label tw-label--sp">Send ringgit to</div>
      <div className="tw-list">
        {banks.map((b) => (
          <MethodRow
            key={b.id}
            mark={<IcBank width={20} height={20} />}
            title={`${b.brand} •••• ${b.last4}`}
            sub={b.sub}
            on={b.id === pick}
            onClick={() => setPick(b.id)}
          />
        ))}
      </div>

      <div className="tw-details">
        <Detail label="Amount" value={sui(value)} />
        <Detail label={`Fee (${(SELL_FEE_RATE * 100).toFixed(1)}%)`} value={sui(fee)} />
        <Detail label="You receive" value={myr(proceeds)} strong />
      </div>

      <button className="tw-btn" disabled={value <= 0 || !!amountError} onClick={() => setStep('confirm')}>
        Continue
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
  return (
    <button className="tw-tx" onClick={() => onOpen?.(tx)}>
      <span className={`tw-tx-icon ${tx.dir}`} aria-hidden="true">
        {incoming ? <IcReceive width={18} height={18} /> : <IcSend width={18} height={18} />}
      </span>
      <span className="tw-tx-body">
        <span className="tw-tx-t">{tx.title}</span>
        <span className="tw-tx-s">{whenLabel(tx.ts)}</span>
      </span>
      <span className="tw-tx-amt">
        <span className={incoming ? 'in' : 'out'}>{incoming ? '+' : '−'}{sui(tx.sui)}</span>
        <span className="tw-tx-fiat">{myr(tx.sui)}</span>
      </span>
    </button>
  );
}

export function TxDetail({ tx, onExit }) {
  const incoming = tx.dir === 'in';
  const KIND = { transfer: 'Transfer', topup: 'Purchase', cashout: 'Withdrawal' };

  return (
    <Screen title={KIND[tx.kind] ?? 'Transaction'} onBack={onExit}>
      <div className="tw-hero">
        <span className={`tw-tx-icon big ${tx.dir}`} aria-hidden="true">
          {incoming ? <IcReceive width={26} height={26} /> : <IcSend width={26} height={26} />}
        </span>
        <p className="tw-hero-amt">{incoming ? '+' : '−'}{sui(tx.sui)}</p>
        <p className="tw-hero-sub">{myr(tx.sui)}</p>
      </div>

      <div className="tw-details">
        <Detail label={incoming ? 'From' : 'To'} value={tx.title} />
        {tx.handle && <Detail label="Account" value={tx.handle} />}
        <Detail label="Date" value={whenLabel(tx.ts)} />
        <Detail label="Amount" value={sui(tx.sui)} />
        <Detail label={tx.kind === 'transfer' ? 'Network fee' : 'Fee'} value={sui(tx.fee)} />
        <Detail
          label={incoming ? 'Credited' : 'Debited'}
          value={sui(incoming ? tx.sui : tx.sui + (tx.kind === 'transfer' ? tx.fee : 0))}
          strong
        />
        <Detail label="Network" value="Sui" />
        <Detail label="Status" value={tx.real ? 'Settled on chain' : 'Completed (demo)'} />
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

export function SettingsScreen({ profile, address, live, setLive, onExit, onSignOut }) {
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
        <Detail label="Currency" value="SUI" />
        <Detail label="Derivation" value="From your Google account" />
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
