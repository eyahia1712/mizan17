import { useState, useEffect, useRef } from 'react';
import { provisionSteps } from '../data/mockData.js';
import { googleConfigured, signInWithGoogle } from '../lib/auth.js';
import GoogleChooser from './GoogleChooser.jsx';

/* The three figures on the landing page. */
const FIGURES = [
  { cls: 'cell--v', v: '2s',        l: 'to settle, any corridor' },
  { cls: 'cell--s', v: '0.005 SUI', l: 'network fee per transfer' },
  { cls: 'cell--k', v: '0',         l: 'documents to open an account' },
];

export default function SignIn({ onDone }) {
  const [phase, setPhase] = useState('idle');   // idle | working | choose | error
  const [step, setStep] = useState(-1);
  const [error, setError] = useState(null);
  const profileRef = useRef(null);
  const modeRef = useRef('local');              // 'google' when a client id is set

  // The provisioning sequence runs first, so the wallet exists before an account
  // is attached to it. On the Google path it waits on the last step until the
  // chooser comes back, rather than claiming to be finished before it is.
  useEffect(() => {
    if (phase !== 'working') return;

    const last = provisionSteps.length - 1;
    const t = setTimeout(() => {
      setStep((s) => {
        if (s >= provisionSteps.length) return s;
        if (s === last && modeRef.current === 'google' && !profileRef.current) return s;
        return s + 1;
      });
    }, 430);
    return () => clearTimeout(t);
  }, [phase, step]);

  // Sequence finished. Either the real chooser has already answered, or it is
  // this app's turn to ask which account to use.
  useEffect(() => {
    if (phase !== 'working' || step < provisionSteps.length) return;

    if (modeRef.current === 'local') {
      const t = setTimeout(() => setPhase('choose'), 260);
      return () => clearTimeout(t);
    }
    if (profileRef.current) {
      const t = setTimeout(() => onDone(profileRef.current), 420);
      return () => clearTimeout(t);
    }
  }, [phase, step, onDone]);

  function begin() {
    setError(null);
    setStep(0);
    setPhase('working');
    profileRef.current = null;
    modeRef.current = googleConfigured() ? 'google' : 'local';

    if (modeRef.current === 'local') return;

    // Must be opened straight out of the click, or the browser blocks the popup.
    signInWithGoogle()
      .then((profile) => { profileRef.current = profile; })
      .catch((e) => {
        profileRef.current = null;
        setError(e.message);
        setPhase('error');
        setStep(-1);
      });
  }

  const busy = phase === 'working';

  return (
    <main className="landing">
      <div className="wrap landing-top">
        <span className="eyebrow">Borderless payments</span>
        <span className="eyebrow">Prototype · Sui testnet</span>
      </div>

      <div className="wrap landing-body">
        <div className="hero-mark">
          <span className="latin">MIZAN</span>
          <span className="rule" />
          <span className="arabic" lang="ar" dir="rtl">ميزان</span>
        </div>

        <h1 className="hero-claim">Money that<br /><em>follows you.</em></h1>

        <p className="hero-sub">
          An account you cannot be refused, because no one grants it. Sign in with
          the Google account you already have and send money home in seconds.
        </p>

        <div className="hero-cta">
          <button className="btn btn-primary" onClick={begin} disabled={busy}>
            {busy ? <><span className="spinner" /> Setting up</> : 'Continue with Google'}
          </button>
        </div>

        {error && <p className="err hero-err">{error}</p>}

        {step >= 0 && (
          <div className="steps">
            {provisionSteps.map((label, i) => (
              <div key={label} className={`step${i < step ? ' on' : ''}`}>
                <span className="dot" />
                {label}
              </div>
            ))}
          </div>
        )}

        <div className="strip">
          {FIGURES.map((f) => (
            <div key={f.l} className={`cell ${f.cls}`}>
              <span className="v">{f.v}</span>
              <span className="l">{f.l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wrap landing-foot">
        <p className="micro faint measure">
          <strong>Prototype.</strong> Balances, contacts and history are synthetic.
          Transfers in live mode are genuine transactions on Sui testnet, where coins
          carry no monetary value. No real money moves anywhere in this project.
        </p>
        <p className="micro faint">MUBA Blockchain Hackathon 2026 · Sui Track 1</p>
      </div>

      {phase === 'choose' && (
        <GoogleChooser
          onPick={onDone}
          onCancel={() => { setPhase('idle'); setStep(-1); }}
        />
      )}
    </main>
  );
}
