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
import { seedCards, seedBanks, SUI_CHANGE_24H } from '../../data/mockData.js';
import { sui, myr, pct, shortAddr } from '../../lib/format.js';
import { byNewest } from '../../lib/ledger.js';
import {
  Screen, Sparkline, SuiMark,
  IcSend, IcReceive, IcBuy, IcSell, IcHome, IcClock, IcCard, IcBank, IcGear,
  IcQr, IcDown, IcClose, IcNext,
} from './WalletUI.jsx';
import {
  SendFlow, ReceiveScreen, BuyFlow, SellFlow, HistoryScreen, SettingsScreen, TxRow, TxDetail,
} from './Flows.jsx';

const RANGES = ['1D', '1W', '1M', '1Y', 'ALL'];

export default function Wallet({ profile, address, balance, txs, live, setLive, keypair, spendable, onCommit, openOn = 'home', close }) {
  const [view, setView] = useState(openOn);     // home | token | send | receive | buy | sell | history | settings | tx
  const [openTx, setOpenTx] = useState(null);
  const [cards, setCards] = useState(seedCards);

  const sources = useMemo(() => [...cards, ...seedBanks], [cards]);
  const recent = useMemo(() => byNewest(txs).slice(0, 4), [txs]);

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
        return <BuyFlow balance={balance} sources={sources} onAddCard={(c) => setCards((k) => [...k, c])} onCommit={onCommit} onExit={home} />;
      case 'sell':
        return <SellFlow balance={balance} banks={seedBanks} onCommit={onCommit} onExit={home} />;
      case 'history':
        return <HistoryScreen txs={txs} onOpen={openReceipt} onExit={home} />;
      case 'tx':
        return <TxDetail tx={openTx} onExit={() => setView('history')} />;
      case 'settings':
        return <SettingsScreen profile={profile} address={address} live={live} setLive={setLive} onExit={home} onSignOut={close} />;
      case 'token':
        return <TokenScreen balance={balance} txs={txs} onAct={setView} onOpen={openReceipt} onExit={home} />;
      default:
        return (
          <HomeScreen
            profile={profile}
            address={address}
            balance={balance}
            recent={recent}
            onAct={setView}
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
            { k: 'home',     l: 'Home',     I: IcHome },
            { k: 'history',  l: 'History',  I: IcClock },
            { k: 'buy',      l: 'Buy',      I: IcCard },
            { k: 'sell',     l: 'Sell',     I: IcBank },
            { k: 'settings', l: 'Settings', I: IcGear },
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

function HomeScreen({ profile, address, balance, recent, onAct, onOpen }) {
  const [tab, setTab] = useState('tokens');
  const up = SUI_CHANGE_24H >= 0;

  return (
    <div className="tw-screen">
      <header className="tw-bar">
        <button className="tw-icon-btn" onClick={() => onAct('settings')} aria-label="Settings">
          <span className="tw-avatar sm">{profile.name?.[0]?.toUpperCase() ?? '?'}</span>
        </button>

        <button className="tw-wallet-pill" onClick={() => onAct('settings')}>
          Main Wallet <IcDown width={15} height={15} />
        </button>

        <button className="tw-icon-btn" onClick={() => onAct('receive')} aria-label="Receive">
          <IcQr width={20} height={20} />
        </button>
      </header>

      <div className="tw-body">
        <div className="tw-total">
          <p className="tw-total-amt">{sui(balance)}</p>
          <p className="tw-total-sub">
            {myr(balance)}
            <span className={`tw-delta ${up ? 'up' : 'down'}`}>{pct(SUI_CHANGE_24H)}</span>
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
            <button className="tw-token" onClick={() => onAct('token')}>
              <SuiMark size={40} />
              <span className="tw-token-body">
                <span className="tw-token-t">SUI</span>
                <span className="tw-token-s">
                  {myr(1)}
                  <span className={`tw-delta ${up ? 'up' : 'down'}`}>{pct(SUI_CHANGE_24H)}</span>
                </span>
              </span>
              <span className="tw-token-amt">
                <span>{sui(balance, { bare: true })}</span>
                <span className="tw-token-fiat">{myr(balance)}</span>
              </span>
            </button>

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

function TokenScreen({ balance, txs, onAct, onOpen, onExit }) {
  const [range, setRange] = useState('1M');
  const up = SUI_CHANGE_24H >= 0;
  const rows = useMemo(() => byNewest(txs).slice(0, 8), [txs]);

  return (
    <Screen title="SUI" onBack={onExit}>
      <div className="tw-hero">
        <SuiMark size={56} />
        <p className="tw-hero-amt">{myr(1)}</p>
        <p className="tw-hero-sub">
          <span className={`tw-delta ${up ? 'up' : 'down'}`}>{pct(SUI_CHANGE_24H)}</span> today
        </p>
      </div>

      <div className="tw-chart"><Sparkline seed={`sui-${range}`} up={up} /></div>

      <div className="tw-ranges">
        {RANGES.map((r) => (
          <button key={r} className={r === range ? 'on' : ''} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>

      <div className="tw-holding">
        <span className="tw-label">Your balance</span>
        <p className="tw-holding-amt">{sui(balance)}</p>
        <p className="tw-holding-sub">{myr(balance)}</p>
      </div>

      <ActionRow onAct={onAct} />

      <div className="tw-section-head"><h3>Transactions</h3></div>
      <div className="tw-list">
        {rows.map((t) => <TxRow key={t.id} tx={t} onOpen={onOpen} />)}
      </div>

      <div className="tw-about">
        <h4>About SUI</h4>
        <p>
          SUI is the native coin of the Sui network. It pays for gas, secures the network
          through staking, and settles in about two seconds — which is what makes a
          transfer feel like a message rather than a bank instruction.
        </p>
      </div>
    </Screen>
  );
}
