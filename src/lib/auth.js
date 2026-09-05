/**
 * Google sign-in, as a popup.
 *
 * The popup must be opened straight out of the click handler or the browser
 * blocks it. It lands back on this same origin, posts the ID token to its
 * opener and closes. We get back the name, email and Google subject id; the
 * subject id is what the Sui address is derived from.
 *
 * The token signature is not verified — that needs Google's JWKS on a server.
 * The token comes straight from Google over TLS and `state` guards the round
 * trip, which is enough for a prototype with no backend but not for production.
 */

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const CHANNEL = 'mizan-oauth';

export const googleConfigured = () => CLIENT_ID.length > 0;

/** Must match a redirect URI registered on the OAuth client, exactly. */
export const redirectUri = () => `${window.location.origin}/`;

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function decodeJwtPayload(token) {
  const part = token.split('.')[1];
  if (!part) throw new Error('Malformed token.');
  const json = decodeURIComponent(
    atob(part.replace(/-/g, '+').replace(/_/g, '/'))
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
  return JSON.parse(json);
}

/**
 * Runs inside the popup, before React mounts. Returns true when this page load
 * is the OAuth landing, in which case the app must not render.
 */
export function handlePopupCallback() {
  if (!window.opener || window.opener === window) return false;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const idToken = params.get('id_token');
  const error = params.get('error');
  if (!idToken && !error) return false;

  window.opener.postMessage(
    { source: CHANNEL, idToken, error, state: params.get('state') },
    window.location.origin
  );
  window.close();
  return true;
}

/** Open Google's account chooser and resolve with the chosen profile. */
export function signInWithGoogle() {
  const state = randomToken();
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce: randomToken(),
    state,
    prompt: 'select_account',
  });

  const w = 480;
  const h = 640;
  const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - h) / 3);

  const popup = window.open(
    `${AUTH_ENDPOINT}?${params}`,
    'mizan-google',
    `width=${w},height=${h},left=${Math.round(left)},top=${Math.round(top)}`
  );

  if (!popup) {
    return Promise.reject(new Error('Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'));
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    function finish(fn, arg) {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearInterval(watch);
      try { popup.close(); } catch { /* already closed */ }
      fn(arg);
    }

    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== CHANNEL) return;

      const { idToken, error, state: got } = event.data;
      if (error) return finish(reject, new Error(describe(error)));
      if (got !== state) return finish(reject, new Error('Sign-in could not be verified. Please try again.'));

      try {
        const claims = decodeJwtPayload(idToken);
        if (!claims.sub) throw new Error('Google did not return an account id.');
        finish(resolve, {
          sub: claims.sub,
          name: claims.name || claims.email || 'Account holder',
          email: claims.email || '',
        });
      } catch {
        finish(reject, new Error('The sign-in response could not be read.'));
      }
    }

    // Nothing tells us when the popup is dismissed, so poll for it.
    const watch = setInterval(() => {
      if (popup.closed) finish(reject, new Error('Sign-in was cancelled.'));
    }, 400);

    window.addEventListener('message', onMessage);
  });
}

function describe(code) {
  if (code === 'access_denied') return 'Sign-in was cancelled.';
  if (code === 'redirect_uri_mismatch') {
    return `This origin is not registered on the OAuth client. Add ${redirectUri()} to its authorised redirect URIs.`;
  }
  return `Google returned an error (${code}).`;
}

/* ------------------- accounts without a client id ----------------- */

/**
 * A web page cannot list the Google accounts signed in on the device; only
 * Google can, and only through a registered OAuth client. So:
 *
 *   • with VITE_GOOGLE_CLIENT_ID set, signInWithGoogle() opens the real chooser
 *   • without it, the app shows its own chooser over the list below, which is
 *     extended in localStorage as accounts are added
 *
 * Edit SEED_ACCOUNTS to change what a fresh browser starts with.
 */
const SEED_ACCOUNTS = [
  { name: 'Eya Hia',  email: 'kham3782@gmail.com' },
  { name: 'Eya Hia',  email: 'eyahia.dev@gmail.com' },
];

const ACCOUNTS_KEY = 'mizan.accounts';

/** Same email, same subject id — so the same Sui address every time. */
export const subjectFor = (email) => `g:${String(email).trim().toLowerCase()}`;

const shape = (a) => ({
  name: (a.name || '').trim() || a.email,
  email: (a.email || '').trim(),
  sub: subjectFor(a.email),
});

export function deviceAccounts() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
  } catch {
    // unreadable storage — fall back to the seed accounts
  }

  const list = [...SEED_ACCOUNTS, ...(Array.isArray(saved) ? saved : [])]
    .filter((a) => a && a.email)
    .map(shape);

  // Last write wins, so re-adding an account renames it instead of duplicating it.
  const byEmail = new Map(list.map((a) => [a.email.toLowerCase(), a]));
  return [...byEmail.values()];
}

export function rememberAccount(account) {
  const next = shape(account);
  try {
    const saved = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    const kept = (Array.isArray(saved) ? saved : [])
      .filter((a) => a?.email?.toLowerCase() !== next.email.toLowerCase());
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...kept, next]));
  } catch {
    // non-fatal: the account still works for this session
  }
  return next;
}

export function forgetAccount(email) {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    localStorage.setItem(
      ACCOUNTS_KEY,
      JSON.stringify((Array.isArray(saved) ? saved : []).filter(
        (a) => a?.email?.toLowerCase() !== String(email).toLowerCase()
      ))
    );
  } catch {
    // non-fatal
  }
}
