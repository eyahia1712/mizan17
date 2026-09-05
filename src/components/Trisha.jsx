import { useState, useEffect, useRef, useCallback } from 'react';
import { token, fiat } from '../lib/format.js';
import { totalCost, NETWORK_FEE_SUI, checkAmount } from '../lib/ledger.js';
import { loadRecipients } from '../lib/recipients.js';
import { parseCommand, fillGap, isYes, isNo } from '../lib/commands.js';
import { voiceSupported, createEar, createLevelMeter, detectWake, say, hush, chime } from '../lib/voice.js';

/**
 * Trisha, the voice assistant.
 *
 * Nothing is on screen until she is called. She listens for her name, opens,
 * takes the sentence, fills the transaction in and reads it back — and only
 * moves money once someone has said yes out loud.
 *
 * The confirmation is the point: "eighty" and "eighteen" are one mishearing
 * apart, and that difference is somebody's rent.
 */

const SLEEP_AFTER = 12_000;          // close if the conversation goes quiet

/* She answers and gets out of the way rather than reciting what she can do. */
const GREETING = "Aha, I'm listening.";
const EXAMPLE = 'Try: “send twenty to Ayesha”';

export default function Trisha({ balances, live, onSend, onOpenWallet }) {
  const [phase, setPhase] = useState('idle');   // idle | listening | confirming | working | done | error
  const [heard, setHeard] = useState('');
  const [line, setLine] = useState('');
  const [intent, setIntent] = useState(null);
  const [level, setLevel] = useState(0);
  const [tip, setTip] = useState(null);
  const [denied, setDenied] = useState(false);

  const earRef = useRef(null);
  const meterRef = useRef(null);
  const phaseRef = useRef(phase);
  const intentRef = useRef(intent);
  const sleepRef = useRef(null);
  const rafRef = useRef(null);
  const greetedRef = useRef(false);

  phaseRef.current = phase;
  intentRef.current = intent;

  const awake = phase !== 'idle';

  /* ---------------------------- speaking --------------------------- */

  const speak = useCallback((text, hintLine = null) => {
    setLine(text);
    setTip(hintLine);
    earRef.current?.mute(true);
    say(text, { onEnd: () => setTimeout(() => earRef.current?.mute(false), 250) });
  }, []);

  const sleep = useCallback((tone = 'dismissed') => {
    clearTimeout(sleepRef.current);
    hush();
    if (tone) chime(tone);
    setPhase('idle');
    setIntent(null);
    setHeard('');
    setLine('');
    setTip(null);
    greetedRef.current = false;
    meterRef.current?.stop();
  }, []);

  const greet = useCallback(() => {
    greetedRef.current = true;
    setPhase('listening');
    speak(GREETING, EXAMPLE);
  }, [speak]);

  /** Any activity postpones the close, so a pause is not a hang-up. */
  const stayAwake = useCallback(() => {
    clearTimeout(sleepRef.current);
    sleepRef.current = setTimeout(() => sleep(null), SLEEP_AFTER);
  }, [sleep]);

  /* ----------------------------- acting ---------------------------- */

  const describe = useCallback((next) => {
    if (next.kind === 'send') {
      if (!next.recipient || next.amount == null) {
        setPhase('error');
        speak('Sorry, say that again?', EXAMPLE);
        return;
      }
      const problem = checkAmount(String(next.amount), balances.SUI ?? 0);
      if (problem) {
        setPhase('error');
        speak(problem);
        return;
      }
      setIntent(next);
      setPhase('confirming');
      speak(`Send ${next.amount} ${next.asset} to ${next.recipient.name}. Shall I?`);
      return;
    }

    if (next.kind === 'balance') {
      setPhase('done');
      speak(`You have ${token(balances.SUI ?? 0)}, worth ${fiat(balances.SUI ?? 0)}.`);
      return;
    }

    if (next.kind === 'buy' || next.kind === 'swap' || next.kind === 'cashout') {
      const screen = next.kind === 'cashout' ? 'sell' : next.kind;
      const words = { buy: 'buying', swap: 'the swap', cashout: 'cashing out' }[next.kind];
      setPhase('done');
      speak(`Opening ${words}.`);
      // These need a provider or a payout rail chosen by eye, so she opens the
      // screen with the amount filled in rather than deciding it.
      setTimeout(() => { onOpenWallet?.(screen, next.amount ?? null); sleep(null); }, 900);
      return;
    }

    setPhase('error');
    speak('Sorry, say that again?', EXAMPLE);
  }, [balances, speak, onOpenWallet, sleep]);

  /**
   * The one way an intent is acted on, so a command said in one breath — "Hey
   * Trisha, send money to Nurul" — asks the same follow-up question as one said
   * in two.
   */
  const route = useCallback((next) => {
    if (next.kind === 'cancel') { sleep('dismissed'); return; }

    if (next.kind === 'send' && next.missing) {
      setIntent(next);
      setPhase('listening');
      speak(next.missing === 'amount' ? 'How much?' : 'Who should I send it to?');
      return;
    }
    describe(next);
  }, [describe, sleep, speak]);

  const run = useCallback(async () => {
    const job = intentRef.current;
    if (!job) return;
    setPhase('working');
    setLine('Sending…');
    try {
      const tx = await onSend({
        recipient: job.recipient,
        amount: job.amount,
      });
      chime('done');
      setPhase('done');
      speak(`Sent ${tx.amount} SUI to ${job.recipient.name}.`);
      setTimeout(() => sleep(null), 3400);
    } catch (e) {
      setPhase('error');
      speak(e?.message ?? 'That did not go through.');
    }
  }, [onSend, speak, sleep]);

  /* ---------------------------- hearing ---------------------------- */

  const handle = useCallback((text, final) => {
    const phaseNow = phaseRef.current;

    /* Her name is stripped wherever it appears. Chrome delivers each utterance
       twice — interim, then final — so without this the final "hey trisha"
       arrives after she has woken and reads as a command she cannot place. */
    const wake = detectWake(text);
    const body = (wake ? wake.rest : text).trim();

    if (phaseNow === 'idle') {
      if (!wake) return;

      chime('wake');
      setPhase('listening');
      setHeard(body);
      meterRef.current?.start();
      stayAwake();
      greetedRef.current = false;

      if (!final) return;                 // the rest of the sentence is still coming

      // "Hey Trisha, send twenty to Ayesha" arrives as one sentence, so act on
      // it rather than greeting and making someone say it again.
      if (body) { route(parseCommand(body, { recipients: loadRecipients() })); return; }

      greet();
      return;
    }

    stayAwake();
    setHeard(body);
    if (!final) return;

    // Just her name again, or the tail of the utterance that woke her.
    if (!body) {
      if (!greetedRef.current) greet();
      return;
    }

    if (phaseNow === 'confirming') {
      if (isYes(body)) return run();
      if (isNo(body)) { speak('Cancelled.'); setTimeout(() => sleep('dismissed'), 900); return; }
      return;
    }

    const recipients = loadRecipients();
    const pending = intentRef.current;

    // Answering a question she asked, rather than starting a new command
    const next = pending?.missing
      ? fillGap(pending, body, { recipients })
      : parseCommand(body, { recipients });

    route(next);
  }, [greet, route, run, sleep, speak, stayAwake]);

  /* ----------------------------- wiring ---------------------------- */

  useEffect(() => {
    if (!voiceSupported()) return;

    meterRef.current = createLevelMeter();
    const ear = createEar({
      onResult: ({ text, final }) => handle(text, final),
      onError: (code) => {
        if (code === 'not-allowed' || code === 'service-not-allowed') setDenied(true);
      },
    });
    earRef.current = ear;
    ear?.start();

    return () => {
      ear?.stop();
      meterRef.current?.stop();
      clearTimeout(sleepRef.current);
      hush();
    };
  }, [handle]);

  /* The orb follows the microphone level, so it moves with the voice. */
  useEffect(() => {
    if (!awake) { setLevel(0); return; }
    const tick = () => {
      setLevel(meterRef.current?.level() ?? 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(rafRef.current);
  }, [awake]);

  /* The same path the microphone takes, from a typed sentence. Used for testing
     and as a fallback on a browser that cannot listen. */
  useEffect(() => {
    const onHear = (e) => handle(String(e.detail ?? ''), true);
    window.addEventListener('trisha:hear', onHear);
    return () => window.removeEventListener('trisha:hear', onHear);
  }, [handle]);

  useEffect(() => {
    if (!awake) return;
    const onKey = (e) => { if (e.key === 'Escape') sleep('dismissed'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [awake, sleep]);

  if (!voiceSupported()) return null;

  /* ---------------------------------------------------------------- */

  /* The badge is not a control. It is the only sign the feature exists, for
     someone who would otherwise never know they can talk to the page. */
  const badge = denied ? (
    <div className="tr-hint tr-hint--warn" role="status">
      Trisha needs the microphone. Allow it in the address bar, then reload.
    </div>
  ) : (
    <div className="tr-badge">
      <span className="tr-badge-dot" aria-hidden="true" />
      Say “Hey Trisha”
    </div>
  );

  if (!awake) return badge;

  const ready = intent?.kind === 'send' && intent.recipient && intent.amount != null;

  return (
    <>
    {badge}
    <div className="tr" role="dialog" aria-live="polite" aria-label="Trisha">
      <div className="tr-head">
        <Orb level={level} phase={phase} />
        <div className="tr-said">
          <span className="tr-name">Trisha</span>
          <span className="tr-line">{line}</span>
        </div>
        <button className="tr-x" onClick={() => sleep('dismissed')} aria-label="Dismiss">×</button>
      </div>

      {heard && phase !== 'working' && (
        <p className="tr-heard">“{heard}”</p>
      )}

      {ready && (phase === 'confirming' || phase === 'working') && (
        <div className="tr-slip">
          <div className="tr-slip-row">
            <span>To</span>
            <span>{intent.recipient.name}</span>
          </div>
          <div className="tr-slip-row">
            <span>Amount</span>
            <span>{token(intent.amount)}</span>
          </div>
          <div className="tr-slip-row">
            <span>Network fee</span>
            <span>{token(NETWORK_FEE_SUI)}</span>
          </div>
          <div className="tr-slip-row tr-slip-row--total">
            <span>Total</span>
            <span>{token(totalCost(intent.amount), 'SUI', { up: true })}</span>
          </div>
          {live && <p className="tr-live">Live mode — this signs a real testnet transaction.</p>}
        </div>
      )}

      {phase === 'confirming'
        ? <p className="tr-ask">Say <b>yes</b> to send, or <b>no</b> to cancel.</p>
        : tip && <p className="tr-ask">{tip}</p>}
    </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

/** The orb: three soft fields that turn against each other and swell with the voice. */
function Orb({ level, phase }) {
  const scale = 1 + Math.min(level, 1) * 0.34;
  return (
    <span className={`tr-orb tr-orb--${phase}`} style={{ '--amp': scale }} aria-hidden="true">
      <span className="tr-blob a" />
      <span className="tr-blob b" />
      <span className="tr-blob c" />
    </span>
  );
}
