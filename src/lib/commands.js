/**
 * Turns a spoken sentence into something the app can do.
 *
 * No model and no network. The set of commands is small enough that a parser
 * beats an LLM here: it answers instantly, works offline, and cannot invent a
 * recipient who does not exist.
 */

/* --------------------- numbers, as people say them ---------------- */

/* Homophones are left out on purpose. "to" and "for" are the two commonest
   words in a payment sentence, and reading them as 2 and 4 would turn
   "twenty five to Ayesha" into 27 — a wrong number that looks plausible. */
const UNITS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4,
  five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};

/* Words carried inside a number without being one: "a hundred and fifty". */
const FILLERS = new Set(['and', 'a', 'an']);

const TENS = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const isNumberWord = (t) => t in UNITS || t in TENS || t === 'hundred' || t === 'thousand';

/** "twenty five" → 25, "one hundred and fifty" → 150. Null if not a number. */
export function wordsToNumber(tokens) {
  let total = 0;
  let current = 0;
  let seen = false;

  for (const t of tokens) {
    if (FILLERS.has(t)) continue;
    if (t in UNITS) { current += UNITS[t]; seen = true; }
    else if (t in TENS) { current += TENS[t]; seen = true; }
    else if (t === 'hundred') { current = (current || 1) * 100; seen = true; }
    else if (t === 'thousand') { total += (current || 1) * 1000; current = 0; seen = true; }
    else return null;
  }
  return seen ? total + current : null;
}

const clean = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Pull an amount out of a sentence. Digits win when present: recognisers write
 * "20" when confident and "twenty" when guessing.
 */
export function extractAmount(text) {
  const t = clean(text);

  const digits = t.match(/(\d+(?:\.\d+)?)/);
  if (digits) return Number(digits[1]);

  const tokens = t.split(' ');

  // "twenty point five" — the decimal is spoken, not written
  const point = tokens.indexOf('point');
  if (point > 0) {
    const whole = wordsToNumber(tokens.slice(0, point).filter(isNumberWord));
    const after = tokens.slice(point + 1).filter((w) => w in UNITS);
    if (whole != null && after.length) {
      const decimals = after.map((w) => UNITS[w]).join('');
      return Number(`${whole}.${decimals}`);
    }
  }

  // Otherwise the longest run of number words anywhere in the sentence
  let best = null;
  for (let i = 0; i < tokens.length; i++) {
    if (!isNumberWord(tokens[i])) continue;
    let j = i;
    while (j < tokens.length && (isNumberWord(tokens[j]) || FILLERS.has(tokens[j]))) j++;
    const value = wordsToNumber(tokens.slice(i, j));
    if (value != null && (best == null || j - i > best.len)) best = { value, len: j - i };
    i = j;
  }
  return best?.value ?? null;
}

/* ------------------ names, as recognisers hear them --------------- */

function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    const row = [i];
    for (let j = 1; j <= n; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = row;
  }
  return prev[n];
}

/** 1 is identical, 0 is nothing alike. */
export function similarity(a, b) {
  if (!a || !b) return 0;
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - editDistance(a, b) / longest;
}

/**
 * Find who was meant. "Ayesha" comes back as "Aisha" or "Ayesh" depending on
 * the accent and the microphone, so an exact match is not enough — but the
 * threshold stays high, because paying the wrong person is the worse failure.
 */
export function matchRecipient(text, recipients = []) {
  const tokens = clean(text).split(' ').filter(Boolean);
  if (!tokens.length) return null;

  // One- and two-word candidates, so "Uncle Prakash" matches as well as "Prakash"
  const candidates = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) candidates.push(`${tokens[i]} ${tokens[i + 1]}`);

  let best = null;
  for (const person of recipients) {
    const name = person.name.toLowerCase();
    for (const candidate of candidates) {
      const score = similarity(name, candidate);
      if (!best || score > best.score) best = { person, score, heard: candidate };
    }
  }
  return best && best.score >= 0.62 ? best : null;
}

/* ----------------------------- intent ---------------------------- */

const has = (t, ...words) => words.some((w) => new RegExp(`\\b${w}\\b`).test(t));

export const isYes = (t) => has(clean(t), 'yes', 'yeah', 'yep', 'yup', 'confirm', 'correct', 'sure', 'ok', 'okay', 'go ahead', 'do it', 'send it', 'please');
export const isNo  = (t) => has(clean(t), 'no', 'nope', 'cancel', 'stop', 'never mind', 'nevermind', 'don\'t', 'dont', 'wait');

const assetIn = (t) =>
  has(t, 'usdt', 'tether') ? 'USDT'
  : has(t, 'sui', 'sweet', 'swee') ? 'SUI'
  : null;

/** What was asked for. Anything it cannot place comes back as `unknown`. */
export function parseCommand(text, { recipients = [] } = {}) {
  const t = clean(text);
  if (!t) return { kind: 'unknown' };

  if (has(t, 'cancel', 'stop', 'never mind', 'nevermind', 'forget it')) return { kind: 'cancel' };

  if (has(t, 'balance', 'how much') && !has(t, 'send', 'pay', 'transfer')) {
    return { kind: 'balance' };
  }

  if (has(t, 'cash out', 'cashout', 'withdraw', 'sell')) {
    return { kind: 'cashout', amount: extractAmount(t) };
  }

  if (has(t, 'swap', 'convert', 'exchange')) {
    const to = has(t, 'to usdt', 'into usdt', 'for usdt') ? 'USDT' : has(t, 'to sui', 'into sui', 'for sui') ? 'SUI' : null;
    const from = to === 'USDT' ? 'SUI' : to === 'SUI' ? 'USDT' : assetIn(t) ?? 'SUI';
    return { kind: 'swap', amount: extractAmount(t), from, to: to ?? (from === 'SUI' ? 'USDT' : 'SUI') };
  }

  if (has(t, 'buy', 'purchase', 'top up', 'topup')) {
    return { kind: 'buy', amount: extractAmount(t), asset: assetIn(t), inRinggit: has(t, 'ringgit', 'rm', 'myr') };
  }

  if (has(t, 'send', 'pay', 'transfer', 'give')) {
    const amount = extractAmount(t);

    // Look for the name after "to" first, then in the whole sentence —
    // "send Bilal twenty" has no "to" in it at all.
    const after = t.split(/\bto\b/).slice(1).join(' ');
    const match = matchRecipient(after, recipients) ?? matchRecipient(t, recipients);

    return {
      kind: 'send',
      amount,
      asset: assetIn(t) ?? 'SUI',
      recipient: match?.person ?? null,
      confidence: match?.score ?? 0,
      missing: !match ? 'recipient' : amount == null ? 'amount' : null,
    };
  }

  return { kind: 'unknown' };
}

/** Merge a follow-up answer into a command that was missing something. */
export function fillGap(intent, text, { recipients = [] } = {}) {
  if (intent.missing === 'amount') {
    const amount = extractAmount(text);
    if (amount == null) return intent;
    return { ...intent, amount, missing: intent.recipient ? null : 'recipient' };
  }
  if (intent.missing === 'recipient') {
    const match = matchRecipient(text, recipients);
    if (!match) return intent;
    return { ...intent, recipient: match.person, confidence: match.score, missing: intent.amount == null ? 'amount' : null };
  }
  return intent;
}
