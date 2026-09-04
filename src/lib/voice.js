/**
 * Ears, voice and a chime — all of it in the browser.
 *
 * Nothing here talks to a server of ours. Speech recognition is the platform's
 * own (`SpeechRecognition`), speech output is `speechSynthesis`, and the chime
 * is two oscillators rather than a sound file, so the assistant works with the
 * venue wifi down and adds nothing to the bundle.
 *
 * One thing worth being straight about: in Chrome, `SpeechRecognition` sends
 * audio to Google to transcribe it. That is the browser's implementation, not
 * a choice this code makes, and it is the reason the assistant is only ever
 * armed while someone is signed in.
 */

const Recogniser = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

export const voiceSupported = () => !!Recogniser;

/* ------------------------------------------------------------------ */
/* Listening                                                           */
/* ------------------------------------------------------------------ */

/**
 * A recogniser that stays up.
 *
 * Chrome stops listening on its own after a stretch of silence, so continuous
 * really means "restart it every time it gives up". The backoff keeps a
 * failing microphone from turning into a tight loop.
 */
export function createEar({ lang = 'en-US', onResult, onError, onListening } = {}) {
  if (!Recogniser) return null;

  const rec = new Recogniser();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = lang;
  rec.maxAlternatives = 1;

  let wanted = false;
  let muted = false;                     // true while the assistant is talking
  let backoff = 250;
  let timer = null;

  rec.onresult = (event) => {
    if (muted) return;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? '';
      if (text.trim()) onResult?.({ text, final: result.isFinal });
    }
    backoff = 250;
  };

  rec.onerror = (event) => {
    // "no-speech" and "aborted" are ordinary silence, not failures.
    if (event.error === 'no-speech' || event.error === 'aborted') return;
    onError?.(event.error);
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') wanted = false;
  };

  rec.onstart = () => onListening?.(true);

  rec.onend = () => {
    onListening?.(false);
    if (!wanted) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        rec.start();
      } catch {
        backoff = Math.min(backoff * 2, 4000);   // already running, or the mic is gone
      }
    }, backoff);
  };

  return {
    start() {
      wanted = true;
      try { rec.start(); } catch { /* already running */ }
    },
    stop() {
      wanted = false;
      clearTimeout(timer);
      try { rec.abort(); } catch { /* never started */ }
    },
    /** Deafen without stopping, so the assistant does not transcribe itself. */
    mute(value) { muted = value; },
  };
}

/* ------------------------------------------------------------------ */
/* How loud                                                            */
/* ------------------------------------------------------------------ */

/**
 * A live level from the microphone, so the orb moves with the voice instead of
 * looping an animation that has nothing to do with what is being said.
 */
export function createLevelMeter() {
  let ctx = null;
  let stream = null;
  let raf = null;
  let level = 0;

  return {
    async start() {
      if (ctx) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        return;                                   // no meter; the orb idles instead
      }
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        level += (Math.min(1, rms * 6) - level) * 0.25;   // smoothed, or it jitters
        raf = requestAnimationFrame(tick);
      };
      tick();
    },
    stop() {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
      ctx = null;
      stream = null;
      level = 0;
    },
    level: () => level,
  };
}

/* ------------------------------------------------------------------ */
/* Speaking                                                            */
/* ------------------------------------------------------------------ */

/** Prefer a voice that sounds like the name on the panel. */
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  const wanted = /samantha|karen|serena|zira|female|google uk english female|google us english/i;
  return voices.find((v) => v.lang.startsWith('en') && wanted.test(v.name))
    ?? voices.find((v) => v.lang.startsWith('en'))
    ?? voices[0];
}

export function say(text, { onStart, onEnd } = {}) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return; }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1.02;
  utterance.pitch = 1.05;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  speechSynthesis.speak(utterance);
}

export const hush = () => { try { speechSynthesis.cancel(); } catch { /* nothing to stop */ } };

/* ------------------------------------------------------------------ */
/* The chime                                                           */
/* ------------------------------------------------------------------ */

let audio = null;

/**
 * Two notes, synthesised. Deliberately not a recording of anyone else's
 * assistant — this one is ours, and it is fifteen lines rather than an asset.
 */
export function chime(kind = 'wake') {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();

    const notes =
      kind === 'wake' ? [[660, 0], [990, 0.09]]
      : kind === 'done' ? [[880, 0], [1320, 0.08]]
      : [[440, 0], [330, 0.09]];                  // dismissed

    for (const [frequency, at] of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;

      const t = audio.currentTime + at;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    }
  } catch {
    /* no audio context — the panel still appears */
  }
}

/* ------------------------------------------------------------------ */
/* The wake word                                                       */
/* ------------------------------------------------------------------ */

/**
 * Recognisers do not know the name, so they guess at it. These are what
 * "Trisha" actually comes back as, and matching the guesses is the difference
 * between an assistant that answers and one that ignores you.
 */
const WAKE = /\b(hey|hi|hello|ok|okay|yo)[\s,]+(trisha|tricia|trischa|trisa|tresha|treasure|tricha|trish|teresa|theresa|tarisha|trisha's|patricia|tricia's)\b/i;

/** Where the name ends, so the rest of the sentence can be taken as the command. */
export function detectWake(text) {
  const match = WAKE.exec(text);
  if (!match) return null;
  return { rest: text.slice(match.index + match[0].length).trim() };
}
