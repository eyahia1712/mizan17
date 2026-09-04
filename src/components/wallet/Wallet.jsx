/**
 * The wallet.
 *
 * A self-contained crypto wallet living inside Mizan, laid out the way the
 * wallets people already use are laid out: a balance, a row of round actions,
 * a token list, a bottom bar. It is the same ledger the rest of the app reads,
 * so anything done here moves the dashboard behind it.
 *
 * Everything is denominated in SUI. Ringgit appears only as what the money is
 * worth on the way in and out.
 */

import { useState, useMemo, useEffect } from 'react';
import { seedCards, buyRails, payoutRails, ASSETS } from '../../data/mockData.js';
import { token, fiat, pct, shortAddr, cash } from '../../lib/format.js';
import { byNewest } from '../../lib/ledger.js';
import { rateMyr } from '../../lib/market.js';
import {
  Screen, Sparkline, AssetMark, TrustMark, CurrencyPicker,
  IcSend, IcReceive, IcBuy, IcSell, IcHome, IcClock, IcCard, IcSwap, IcGear,
  IcQr, IcDown, IcClose, IcNext,
} from './WalletUI.jsx';
import {
  SendFlow, ReceiveScreen, BuyFlow, SellFlow, SwapFlow, HistoryScreen, SettingsScreen, TxRow, TxDetail,
} from './Flows.jsx';

const RANGES = ['1D', '1W', '1M', '1Y', 'ALL'];


export default function Wallet({ profile, address, balances, txs, live, setLive, keypair, spendable, currency, onCurrency, onCommit, openOn = 'home', prefill = null, close }) {
  const [view, setView] = useState(openOn);     // home | token | send | receive | buy | sell | swap | history | settings | tx
  const [openTx, setOpenTx] = useState(null);
  const [token_, setToken] = useState('SUI');
  const [extraCards, setExtraCards] = useState([]);

  const rails = useMemo(
    () => [...buyRails, ...extraCards.map((c) => ({ ...c, sub: `Expires ${c.exp}`, eta: 'Instant' }))],
    [extraCards]
  );
  const recent = useMemo(() => byNewest(txs).slice(0, 4), [txs]);
  const balance = balances.SUI ?? 0;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (view === 'home') close();
      else setView('home');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, close]);

  const go = (v) => () => setView(v);
  const home = () => setView('home');
  const openReceipt = (tx) => { setOpenTx(tx); setView('tx'); };

  const screen = () => {
    switch (view) {
      case 'send':
        return <SendFlow balance={balance} address={address} live={live} keypair={keypair} spendable={spendable} onCommit={onCommit} onExit={home} />;
      case 'receive':
        return <ReceiveScreen address={address} onExit={home} />;
      case 'buy':
        return <BuyFlow address={address} rails={rails} prefill={prefill} onAddCard={(c) => setExtraCards((k) => [...k, c])} onCommit={onCommit} onExit={home} />;
      case 'sell':
        return <SellFlow balances={balances} rails={payoutRails} onCommit={onCommit} onExit={home} />;
      case 'swap':
        return <SwapFlow balances={balances} prefill={prefill} onCommit={onCommit} onExit={home} />;
      case 'history':
        return <HistoryScreen txs={txs} onOpen={openReceipt} onExit={home} />;
      case 'tx':
        return <TxDetail tx={openTx} onExit={() => setView('history')} />;
      case 'settings':
        return (
          <SettingsScreen
            profile={profile} address={address} live={live} setLive={setLive}
            currency={currency} onCurrency={onCurrency}
            onExit={home} onSignOut={close}
          />
        );
      case 'token':
        return <TokenScreen asset={token_} balances={balances} txs={txs} onAct={setView} onOpen={openReceipt} onExit={home} />;
      default:
        return (
          <HomeScreen
            profile={profile}
            address={address}
            balances={balances}
            recent={recent}
            currency={currency}
            onCurrency={onCurrency}
            onAct={setView}
            onOpenToken={(a) => { setToken(a); setView('token'); }}
            onOpen={openReceipt}
          />
        );
    }
  };

  return (
    <div className="tw-scrim" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="tw" role="dialog" aria-modal="true" aria-label="Wallet">
        <button className="tw-dismiss" onClick={close} aria-label="Close wallet"><IcClose width={18} height={18} /></button>

        <div className="tw-viewport">{screen()}</div>

        <nav className="tw-nav" aria-label="Wallet sections">
          {[
            { k: 'home',    l: 'Home',    I: IcHome },
            { k: 'history', l: 'History', I: IcClock },
            { k: 'swap',    l: 'Swap',    I: IcSwap },
            { k: 'buy',     l: 'Buy',     I: IcCard },
            { k: 'sell',    l: 'Sell',    I: IcSell },
          ].map(({ k, l, I }) => (
            <button
              key={k}
              className={`tw-nav-item${view === k ? ' on' : ''}`}
              onClick={go(k)}
              aria-current={view === k ? 'page' : undefined}
            >
              <I width={21} height={21} />
              <span>{l}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

const ACTIONS = [
  { k: 'send',    l: 'Send',    I: IcSend },
  { k: 'receive', l: 'Receive', I: IcReceive },
  { k: 'buy',     l: 'Buy',     I: IcBuy },
  { k: 'swap',    l: 'Swap',    I: IcSwap },
  { k: 'sell',    l: 'Sell',    I: IcSell },
];

function ActionRow({ onAct }) {
  return (
    <div className="tw-actions">
      {ACTIONS.map(({ k, l, I }) => (
        <button key={k} className="tw-action" onClick={() => onAct(k)}>
          <span className="tw-action-ring"><I width={21} height={21} /></span>
          <span>{l}</span>
        </button>
      ))}
    </div>
  );
}

function HomeScreen({ profile, address, balances, recent, currency, onCurrency, onAct, onOpenToken, onOpen }) {
  const [tab, setTab] = useState('tokens');

  /* The headline figure is what everything is worth, not what one coin is —
     a wallet holding two assets cannot lead with just one of them. */
  const worth = Object.entries(balances).reduce((n, [asset, held]) => n + held * rateMyr(asset), 0);

  return (
    <div className="tw-screen">
      <header className="tw-bar">
        <button className="tw-icon-btn" onClick={() => onAct('settings')} aria-label="Settings">
          <span className="tw-avatar sm">{profile.name?.[0]?.toUpperCase() ?? '?'}</span>
        </button>

        <button className="tw-wallet-pill" onClick={() => onAct('settings')}>
          <TrustMark size={16} /> Trust Wallet <IcDown width={15} height={15} />
        </button>

        <button className="tw-icon-btn" onClick={() => onAct('receive')} aria-label="Receive">
          <IcQr width={20} height={20} />
        </button>
      </header>

      <div className="tw-body">
        <div className="tw-total">
          {/* The figure and the unit it is counted in, together — the currency
              is a property of the number, not a setting buried elsewhere. */}
          <div className="tw-total-line">
            <p className="tw-total-amt">{cash(worth)}</p>
            <CurrencyPicker value={currency} onChange={onCurrency} />
          </div>
          <p className="tw-total-sub">
            {token(balances.SUI ?? 0)} · {token(balances.USDT ?? 0, 'USDT')}
          </p>
          <button className="tw-addr-pill" onClick={() => onAct('receive')}>
            {shortAddr(address, 6, 6)} <IcQr width={13} height={13} />
          </button>
        </div>

        <ActionRow onAct={onAct} />

        <div className="tw-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'tokens'} className={tab === 'tokens' ? 'on' : ''} onClick={() => setTab('tokens')}>Tokens</button>
          <button role="tab" aria-selected={tab === 'nfts'} className={tab === 'nfts' ? 'on' : ''} onClick={() => setTab('nfts')}>NFTs</button>
        </div>

        {tab === 'tokens' ? (
          <>
            {Object.keys(ASSETS).map((asset) => (
              <button key={asset} className="tw-token" onClick={() => onOpenToken(asset)}>
                <AssetMark asset={asset} size={40} />
                <span className="tw-token-body">
                  <span className="tw-token-t">{asset}</span>
                  <span className="tw-token-s">
                    {cash(rateMyr(asset))}
                    <span className="tw-delta">{pct(ASSETS[asset].change)}</span>
                  </span>
                </span>
                <span className="tw-token-amt">
                  <span>{token(balances[asset] ?? 0, asset, { bare: true })}</span>
                  <span className="tw-token-fiat">{fiat(balances[asset] ?? 0, asset)}</span>
                </span>
              </button>
            ))}

            <button className="tw-ghost-row" onClick={() => onAct('buy')}>
              <span>Manage crypto</span><IcNext width={16} height={16} />
            </button>
          </>
        ) : (
          <p className="tw-empty">No collectibles in this wallet.</p>
        )}

        <div className="tw-section-head">
          <h3>Recent</h3>
          <button onClick={() => onAct('history')}>See all</button>
        </div>

        <div className="tw-list">
          {recent.length === 0
            ? <p className="tw-empty">Nothing here yet.</p>
            : recent.map((t) => <TxRow key={t.id} tx={t} onOpen={onOpen} />)}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SUI, as a token page                                                */
/* ------------------------------------------------------------------ */

function TokenScreen({ asset = 'SUI', balances, txs, onAct, onOpen, onExit }) {
  const [range, setRange] = useState('1M');
  const meta = ASSETS[asset];
  const held = balances[asset] ?? 0;
  const rows = useMemo(
    () => byNewest(txs).filter((t) => t.asset === asset || t.got?.asset === asset).slice(0, 8),
    [txs, asset]
  );

  return (
    <Screen title={asset} onBack={onExit}>
      <div className="tw-hero">
        <AssetMark asset={asset} size={56} />
        <p className="tw-hero-amt">{cash(rateMyr(asset))}</p>
        <p className="tw-hero-sub">
          <span className="tw-delta">{pct(meta.change)}</span> today
        </p>
      </div>

      <div className="tw-chart"><Sparkline seed={`${asset}-${range}`} up={meta.change >= 0} /></div>

      <div className="tw-ranges">
        {RANGES.map((r) => (
          <button key={r} className={r === range ? 'on' : ''} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>

      <div className="tw-holding">
        <span className="tw-label">Your balance</span>
        <p className="tw-holding-amt">{token(held, asset)}</p>
        <p className="tw-holding-sub">{fiat(held, asset)}</p>
      </div>

      <ActionRow onAct={onAct} />

      <div className="tw-section-head"><h3>Transactions</h3></div>
      <div className="tw-list">
        {rows.map((t) => <TxRow key={t.id} tx={t} onOpen={onOpen} />)}
      </div>

      <div className="tw-about">
        <h4>About {asset}</h4>
        <p>
          {asset === 'SUI'
            ? 'SUI is the native coin of the Sui network. It pays for gas, secures the network through staking, and settles in about two seconds — which is what makes a transfer feel like a message rather than a bank instruction.'
            : 'USDT is a dollar-pegged stablecoin. It is the step between a volatile coin and a bank account: an off-ramp can price it in cash, which is why cashing out goes through it rather than selling SUI directly.'}
        </p>
      </div>
    </Screen>
  );
}
