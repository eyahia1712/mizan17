import { useState, useEffect, useCallback, useRef } from 'react';
import SignIn from './components/SignIn.jsx';
import SendSheet from './components/SendSheet.jsx';
import { ReceiveSheet, SplitSheet, WithdrawSheet, AccountSheet, TransactionSheet } from './components/Sheets.jsx';
import { QuickActions, TransactionList } from './components/Home.jsx';
import { PaymentCard, MonthlyPanel } from './components/Dashboard.jsx';
import Wallet from './components/wallet/Wallet.jsx';
import { user as demoUser, transactions as seedTransactions } from './data/mockData.js';
import { loadOrCreateKeypair, keypairForSubject, getBalanceSui } from './lib/sui.js';
import { makeTx, balanceDelta, round, byNewest } from './lib/ledger.js';
import { sui } from './lib/format.js';

/** How many rows the account page shows before handing over to the wallet. */
const ACTIVITY_ROWS = 6;

/** The wallet's mark, small enough to sit inside a button. */
const WalletMark = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path fill="currentColor" d="M12 2.6c.9 1.3 5.9 7.1 5.9 11.1A5.9 5.9 0 0 1 6.1 13.7C6.1 9.7 11.1 3.9 12 2.6Zm0 3.3c-1.4 2-3.6 5.3-3.6 7.8a3.6 3.6 0 1 0 7.2 0c0-2.5-2.2-5.8-3.6-7.8Z" />
  </svg>
);

export default function App() {
  const [profile, setProfile] = useState(null);

  const [live, setLive] = useState(false);
  const [keypair, setKeypair] = useState(null);
  const [address, setAddress] = useState('');

  const [sheet, setSheet] = useState(null);   // null | send | receive | split | withdraw | account | tx
  const [preset, setPreset] = useState(null);
  const [openTx, setOpenTx] = useState(null);
  const [wallet, setWallet] = useState(null); // null, or the wallet screen to open on
  const [chainBalance, setChainBalance] = useState(null);

  /* One balance, one list of transactions. Every figure in the product — the
     card, the tiles, the chart, the wallet — is read off these two. */
  const [balance, setBalance] = useState(demoUser.balanceSui);
  const [txs, setTxs] = useState(seedTransactions);

  const sheetRef = useRef(null);

  // The wallet is derived from the Google account, so it is the same address
  // every time that person signs in — on any machine.
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    (async () => {
      const kp = profile.sub === 'demo'
        ? loadOrCreateKeypair()
        : await keypairForSubject(profile.sub);
      if (cancelled) return;
      setKeypair(kp);
      setAddress(kp.getPublicKey().toSuiAddress());
    })();

    return () => { cancelled = true; };
  }, [profile]);

  /* Live transfers spend real testnet coins, so what can be sent is what the
     account actually holds on chain — not what the demo balance says. */
  useEffect(() => {
    if (!live || !address) { setChainBalance(null); return; }
    let cancelled = false;

    const read = () =>
      getBalanceSui(address)
        .then((b) => { if (!cancelled) setChainBalance(b); })
        .catch(() => { if (!cancelled) setChainBalance(0); });

    read();
    const poll = setInterval(read, 15_000);
    return () => { cancelled = true; clearInterval(poll); };
  }, [live, address]);

  const closeSheet = useCallback(() => { setSheet(null); setPreset(null); setOpenTx(null); }, []);

  useEffect(() => {
    if (!sheet) return;
    sheetRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') closeSheet(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, closeSheet]);

  /**
   * The single way anything is written to the ledger. It returns the entry it
   * created so the screen that asked for it can show a receipt without
   * inventing its own copy of the numbers.
   */
  const commit = useCallback((partial) => {
    const tx = makeTx(partial);
    setBalance((b) => round(b + balanceDelta(tx)));
    setTxs((list) => [tx, ...list]);
    return tx;
  }, []);

  const openWallet = useCallback((screen = 'home') => {
    closeSheet();
    setWallet(screen);
  }, [closeSheet]);

  function recordRequest(count, each) {
    // A request is not money that has arrived: it goes on the list and stays
    // out of the balance and the totals until it is paid.
    commit({
      dir: 'in',
      kind: 'request',
      title: `${count} ${count === 1 ? 'person' : 'people'}`,
      sui: each * count,
      handle: 'Split request',
      fee: 0,
      pending: true,
    });
  }

  if (!profile) return <SignIn onDone={setProfile} />;

  return (
    <div className="page">
      <main className="app">
        <header className="app-top">
          <div className="hero-mark">
            <span className="latin">MIZAN</span>
            <span className="rule" />
            <span className="arabic" lang="ar" dir="rtl">ميزان</span>
          </div>

          <div className="identity">
            <span className="eyebrow">Welcome back</span>
            <span className="name">{profile.name}</span>
          </div>

          <div className="app-top-actions">
            <button className="btn-line btn-wallet" onClick={() => openWallet('home')}>
              <WalletMark />
              Wallet
              <span className="btn-line-v num">{sui(balance)}</span>
            </button>
            <button className="btn-line" onClick={() => setSheet('account')}>Account</button>
          </div>
        </header>

        <div className="app-grid">
          <section className="col">
            <PaymentCard
              balanceSui={balance}
              address={address}
              live={live}
              name={profile.name}
            />
            <QuickActions onPick={setSheet} />
          </section>

          <section className="col">
            <MonthlyPanel items={txs} />
          </section>
        </div>

        {/* A wall of rows is a database dump, not an account page. The recent
            few belong here; the rest live in the wallet's history. */}
        <TransactionList
          items={byNewest(txs).slice(0, ACTIVITY_ROWS)}
          total={txs.length}
          onOpen={(tx) => { setOpenTx(tx); setSheet('tx'); }}
          onSeeAll={() => openWallet('history')}
        />
      </main>

      {sheet && (
        <div className="scrim" onClick={(e) => e.target === e.currentTarget && closeSheet()}>
          <div className="sheet" role="dialog" aria-modal="true" tabIndex={-1} ref={sheetRef}>
            <div className="grab" />
            {sheet === 'send' && (
              <SendSheet
                close={closeSheet}
                preset={preset}
                live={live}
                keypair={keypair}
                balance={balance}
                spendable={chainBalance}
                onCommit={commit}
              />
            )}
            {sheet === 'tx' && openTx && <TransactionSheet close={closeSheet} tx={openTx} />}
            {sheet === 'receive'  && <ReceiveSheet close={closeSheet} address={address} />}
            {sheet === 'split'    && <SplitSheet close={closeSheet} onRequest={recordRequest} />}
            {sheet === 'withdraw' && (
              <WithdrawSheet close={closeSheet} balanceSui={balance} onOpenWallet={openWallet} />
            )}
            {sheet === 'account'  && (
              <AccountSheet
                close={closeSheet}
                profile={profile}
                address={address}
                live={live}
                setLive={setLive}
                balanceSui={balance}
                onOpenWallet={openWallet}
              />
            )}
          </div>
        </div>
      )}

      {wallet && (
        <Wallet
          key={wallet}
          profile={profile}
          address={address}
          balance={balance}
          txs={txs}
          live={live}
          setLive={setLive}
          keypair={keypair}
          spendable={chainBalance}
          onCommit={commit}
          openOn={wallet}
          close={() => setWallet(null)}
        />
      )}
    </div>
  );
}
