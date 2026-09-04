import { useState, useEffect, useRef } from 'react';
import { deviceAccounts, rememberAccount } from '../lib/auth.js';

/**
 * The account chooser.
 *
 * This is the app's own chooser, shown when no OAuth client id is configured.
 * It lists the accounts this browser knows about and hands the chosen one back
 * exactly as Google's chooser would — name, email and a stable subject id, from
 * which the Sui address is derived.
 *
 * It is deliberately Google's layout rather than Mizan's: at this moment in the
 * flow the person is being asked to trust a familiar screen, and inventing a
 * new one for it would be the wrong kind of originality.
 */

const AVATAR_COLOURS = ['#1a73e8', '#d93025', '#188038', '#e37400', '#9334e6', '#00838f'];

const colourFor = (email) => {
  let n = 0;
  for (let i = 0; i < email.length; i++) n = (n * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[n % AVATAR_COLOURS.length];
};

const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const PersonAdd = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#5f6368" aria-hidden="true">
    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

export default function GoogleChooser({ onPick, onCancel }) {
  const [accounts, setAccounts] = useState(() => deviceAccounts());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => { cardRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function addAccount(e) {
    e.preventDefault();
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError('Enter a valid email address.');
      return;
    }
    const account = rememberAccount({ name, email: clean });
    setAccounts(deviceAccounts());
    onPick(account);
  }

  return (
    <div className="gsi-scrim" role="dialog" aria-modal="true" aria-label="Choose an account">
      <div className="gsi-card" tabIndex={-1} ref={cardRef}>
        <header className="gsi-head">
          <GoogleG />
          <h2>{adding ? 'Sign in' : 'Choose an account'}</h2>
          <p>to continue to Mizan</p>
        </header>

        {adding ? (
          <form className="gsi-form" onSubmit={addAccount}>
            <label className="gsi-field">
              <span>Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                autoFocus
              />
            </label>

            <label className="gsi-field">
              <span>Name</span>
              <input
                type="text"
                autoComplete="name"
                placeholder="Optional"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            {error && <p className="gsi-err">{error}</p>}

            <div className="gsi-form-foot">
              <button type="button" className="gsi-text-btn" onClick={() => { setAdding(false); setError(null); }}>
                Back
              </button>
              <button type="submit" className="gsi-next">Next</button>
            </div>
          </form>
        ) : (
          <ul className="gsi-list">
            {accounts.map((a) => (
              <li key={a.email}>
                <button className="gsi-row" onClick={() => onPick(a)}>
                  <span className="gsi-avatar" style={{ background: colourFor(a.email) }} aria-hidden="true">
                    {a.name.trim()[0]?.toUpperCase() ?? '?'}
                  </span>
                  <span className="gsi-who">
                    <span className="gsi-name">{a.name}</span>
                    <span className="gsi-email">{a.email}</span>
                  </span>
                </button>
              </li>
            ))}

            <li>
              <button className="gsi-row" onClick={() => setAdding(true)}>
                <span className="gsi-avatar gsi-avatar--plain" aria-hidden="true"><PersonAdd /></span>
                <span className="gsi-who">
                  <span className="gsi-name">Use another account</span>
                </span>
              </button>
            </li>
          </ul>
        )}

        <p className="gsi-fine">
          To continue, Google will share your name, email address and profile picture
          with Mizan. Before using this app, you can review Mizan's
          {' '}<span className="gsi-link">privacy policy</span> and
          {' '}<span className="gsi-link">terms of service</span>.
        </p>

        <div className="gsi-card-foot">
          <span className="gsi-foot-links"><span>Help</span><span>Privacy</span><span>Terms</span></span>
          <button className="gsi-text-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
