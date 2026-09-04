import { sui, myr } from '../lib/format.js';
import { whenLabel } from '../lib/ledger.js';
import { Send, Receive, Split, Cash, Clock } from './Icons.jsx';

const ACTIONS = [
  { key: 'send',     label: 'Send',     Icon: Send, primary: true },
  { key: 'receive',  label: 'Receive',  Icon: Receive },
  { key: 'split',    label: 'Split',    Icon: Split },
  { key: 'withdraw', label: 'Cash out', Icon: Cash },
];

export function QuickActions({ onPick }) {
  return (
    <nav className="actions" aria-label="Quick actions">
      {ACTIONS.map(({ key, label, Icon, primary }) => (
        <button
          key={key}
          className={`action${primary ? ' primary' : ''}`}
          onClick={() => onPick(key)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function TransactionList({ items, title = 'Activity', onOpen, onSeeAll, total }) {
  const hidden = Math.max(0, (total ?? items.length) - items.length);

  return (
    <section className="section">
      <div className="section-head">
        <h3>{title}</h3>
        {hidden > 0 && onSeeAll && (
          <button onClick={onSeeAll}>All {total} in wallet</button>
        )}
      </div>

      <div className="txs">
        {items.length === 0 ? (
          <div className="empty">
            <Clock />
            <p>No transfers yet. Send one to get started.</p>
          </div>
        ) : (
          items.map((t) => <Row key={t.id} tx={t} onOpen={onOpen} />)
        )}
      </div>
    </section>
  );
}

/** Every row opens its receipt — that is where the digest and the explorer link live. */
function Row({ tx, onOpen }) {
  const incoming = tx.dir === 'in';

  // A request is money asked for, not money that arrived. It says so, and it
  // carries no sign — a "+" would be a claim the balance does not support.
  return (
    <button className="tx" onClick={() => onOpen?.(tx)}>
      <span className={`tx-icon ${tx.dir}`} aria-hidden="true">
        {incoming ? <Receive /> : <Send />}
      </span>
      <span className="tx-body">
        <span className="t1">{tx.title}</span>
        <span className="t2">
          {tx.pending ? `Requested · ${whenLabel(tx.ts)}` : whenLabel(tx.ts)}
        </span>
      </span>
      <span className={`tx-amt num${tx.pending ? ' pending' : incoming ? '' : ' out'}`}>
        <span>{tx.pending ? '' : incoming ? '+' : '−'}{sui(tx.sui)}</span>
        <span className="tx-fiat">{myr(tx.sui)}</span>
      </span>
    </button>
  );
}
