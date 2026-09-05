import { useState, useMemo } from 'react';
import { token, fiat, shortAddr, explorerTx } from '../lib/format.js';
import { checkAmount, sendableFrom, totalCost, NETWORK_FEE_SUI } from '../lib/ledger.js';
import { sendSui, isValidSuiAddress } from '../lib/sui.js';
import { loadRecipients, saveRecipient } from '../lib/recipients.js';
import { Tick, External } from './Icons.jsx';

/**
 * Sending needs two things: who, and how much.
 *
 * "Who" is a Sui address — the only thing that identifies an account on chain.
 * Saved recipients spare you typing it. A new address is saved once the
 * transfer goes through, so any address is typed exactly once.
 */
export default function SendSheet({ close, preset, live, keypair, balance, spendable, onCommit }) {
  const [people, setPeople] = useState(() => loadRecipients());
  const [who, setWho] = useState(preset ?? people[0] ?? null);
  const [mode, setMode] = useState('saved');    // saved | new
  const [newAddr, setNewAddr] = useState('');
  const [newName, setNewName] = useState('');
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState('form');   // form | sending | done
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);

  // In live mode the limit is what the account holds on chain, not the demo balance.
  const limit = live ? (spendable ?? 0) : balance;

  const target = useMemo(() => {
    if (mode === 'saved') return who;
    const address = newAddr.trim();
    return isValidSuiAddress(address)
      ? { id: 'new', name: newName.trim() || shortAddr(address, 8, 6), address, handle: null, isNew: true }
      : null;
  }, [mode, who, newAddr, newName]);

  const value = Number(amount) || 0;
  const amountError = checkAmount(amount, limit);
  const addressTyped = newAddr.trim().length > 0;
  const addressBad = mode === 'new' && addressTyped && !isValidSuiAddress(newAddr);
  const max = sendableFrom(limit);
  const canSend = !!target && value > 0 && !amountError && stage !== 'sending';

  async function submit() {
    setError(null);
    setStage('sending');
    try {
      let digest;
      if (live) {
        digest = await sendSui({ keypair, recipient: target.address, amountSui: value });
      } else {
        await new Promise((r) => setTimeout(r, 1200));
      }

      // Save an address you have now paid, so it is not typed twice.
      if (target.isNew) {
        saveRecipient({ name: target.name, address: target.address });
        setPeople(loadRecipients());
      }

      setSent({
        ...onCommit({
          dir: 'out',
          kind: 'transfer',
          title: target.name,
          asset: 'SUI',
          amount: value,
          handle: target.handle ?? shortAddr(target.address, 8, 6),
          fee: NETWORK_FEE_SUI,
          digest,
          real: live,
          toAddress: target.address,
        }),
        address: target.address,
      });
      setStage('done');
    } catch (e) {
      setError(e?.message ?? 'The transfer could not be completed.');
      setStage('form');
    }
  }

  if (stage === 'done' && sent) {
    return (
      <div className="done">
        <div className="banner">
          <div className="eyebrow">Sent</div>
          <div className="amt num">{token(sent.amount)}</div>
          <div className="to">to {sent.title}</div>
        </div>

        <div className="rows">
          <div className="row"><span>{sent.title} gets</span><span className="num">{fiat(sent.amount)}</span></div>
          <div className="row"><span>Network fee</span><span className="num">{token(sent.fee)}</span></div>
          <div className="row"><span>Debited</span><span className="num">{token(sent.amount + sent.fee, 'SUI', { up: true })}</span></div>
          <div className="row"><span>Balance</span><span className="num">{token(balance)}</span></div>
        </div>

        <div className="field">
          <label>Sent to</label>
          <div className="mono-block">{sent.address}</div>
        </div>

        <div className="field">
          <label>Transaction reference</label>
          <div className="mono-block">{sent.digest}</div>
        </div>

        {sent.real && (
          <a className="link" href={explorerTx(sent.digest)} target="_blank" rel="noreferrer">
            View receipt <External />
          </a>
        )}

        <button className="cta" onClick={close}>Done</button>
      </div>
    );
  }

  return (
    <>
      <h3>Send</h3>

      <div className="seg" role="tablist" aria-label="Recipient">
        <button role="tab" aria-selected={mode === 'saved'} className={mode === 'saved' ? 'on' : ''} onClick={() => setMode('saved')}>
          Saved
        </button>
        <button role="tab" aria-selected={mode === 'new'} className={mode === 'new' ? 'on' : ''} onClick={() => setMode('new')}>
          New address
        </button>
      </div>

      {mode === 'saved' ? (
        people.length === 0 ? (
          <p className="hint">No saved recipients yet. Use <em>New address</em> to send to a wallet.</p>
        ) : (
          <div className="picker">
            {people.map((c) => (
              <button
                key={c.address}
                className={`pick${c.address === who?.address ? ' on' : ''}`}
                onClick={() => setWho(c)}
                aria-pressed={c.address === who?.address}
              >
                <span className="ring" aria-hidden="true">{c.name[0]}</span>
                <span className="pi">
                  <span className="p1">{c.name}</span>
                  <span className="p2 mono">{shortAddr(c.address, 10, 8)}</span>
                </span>
                <span className="check"><Tick /></span>
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="field">
            <label htmlFor="to">Recipient wallet address</label>
            <input
              id="to"
              className="mono"
              autoComplete="off"
              spellCheck="false"
              placeholder="0x…"
              value={newAddr}
              onChange={(e) => setNewAddr(e.target.value.trim())}
              aria-invalid={addressBad}
              autoFocus
            />
            <div className={`hint${addressBad ? ' bad' : ''}`}>
              {addressBad
                ? 'A Sui address is 66 characters and starts with 0x.'
                : addressTyped
                  ? 'Valid Sui address. It will be saved once the transfer goes through.'
                  : 'Paste the public wallet address of the account you are paying.'}
            </div>
          </div>

          <div className="field">
            <label htmlFor="toname">Save as (optional)</label>
            <input
              id="toname"
              autoComplete="off"
              placeholder="A name you will recognise"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
        </>
      )}

      {target && (
        <div className="field">
          <label>Paying</label>
          <div className="mono-block">{target.address}</div>
        </div>
      )}

      <div className="field">
        <div className="field-head">
          <label htmlFor="amt">Amount</label>
          <button className="mini" onClick={() => setAmount(String(max))} disabled={max <= 0}>Max {max}</button>
        </div>
        <div className={`amount-input${amountError ? ' bad' : ''}`}>
          <input
            id="amt"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
          />
          <span className="cur">SUI</span>
        </div>
        <div className={`hint num${amountError ? ' bad' : ''}`}>
          {amountError ?? (value > 0 ? fiat(value) : `Available ${token(limit)}`)}
        </div>
      </div>

      {live && (
        <p className="hint">
          Live transfers spend your on-chain testnet balance, which is {token(spendable ?? 0)}.
          {(spendable ?? 0) <= 0 && <> Fund the account at <a href="https://faucet.sui.io" target="_blank" rel="noreferrer">faucet.sui.io</a> first.</>}
        </p>
      )}

      <div className="rows">
        <div className="row"><span>You send</span><span className="num">{token(value)}</span></div>
        <div className="row"><span>Network fee</span><span className="num">{token(NETWORK_FEE_SUI)}</span></div>
        <div className="row"><span>Total debited</span><span className="num">{token(totalCost(value), 'SUI', { up: true })}</span></div>
        <div className="row"><span>{target ? `${target.name} gets` : 'They get'}</span><span className="num">{fiat(value)}</span></div>
      </div>

      {error && <p className="err">{error}</p>}

      <button className="cta" disabled={!canSend} onClick={submit}>
        {stage === 'sending'
          ? <><span className="spinner" /> Sending</>
          : !target ? 'Choose a recipient' : 'Send'}
      </button>
      <button className="cta ghost" onClick={close}>Cancel</button>
    </>
  );
}
