/**
 * All Sui chain access. There is no backend — the browser talks to the public
 * testnet fullnode directly.
 *
 * Reads (balance, epoch, checkpoint) are always real. Transfers are real when
 * the app is in Live mode: we build a Transaction, sign it with the account
 * keypair and submit it, and the digest we get back opens on the explorer.
 *
 * Testnet coins have no monetary value.
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

export const NETWORK = 'testnet';
export const MIST_PER_SUI = 1_000_000_000n;

export const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

/* ---------------------------- account ---------------------------- */

const KEY_STORAGE = 'mizan.demo.secretKey';

/** Salt so a Google subject id alone is not the whole seed. */
const APP_SALT = 'mizan:sui:testnet:v1';

/**
 * Derive the account keypair from a Google subject id: Ed25519 over
 * SHA-256(salt : sub). Deterministic, so the same Google account gives the
 * same Sui address on any machine and an account funded once stays usable.
 *
 * This stands in for zkLogin. Swapping zkLogin in replaces this function only.
 */
export async function keypairForSubject(sub) {
  const bytes = new TextEncoder().encode(`${APP_SALT}:${sub}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const seed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return Ed25519Keypair.deriveKeypairFromSeed(seed);
}

/** A throwaway keypair for the demo identity, kept for the browser session. */
export function loadOrCreateKeypair() {
  try {
    const saved = sessionStorage.getItem(KEY_STORAGE);
    if (saved) return Ed25519Keypair.fromSecretKey(saved);
  } catch {
    // sessionStorage unavailable — mint a fresh key instead
  }

  const kp = new Ed25519Keypair();
  try {
    sessionStorage.setItem(KEY_STORAGE, kp.getSecretKey());
  } catch {
    // non-fatal
  }
  return kp;
}

/* ----------------------------- reads ----------------------------- */

/** The account's real on-chain balance, in SUI. */
export async function getBalanceSui(address) {
  if (!address) return 0;
  const { totalBalance } = await client.getBalance({ owner: address });
  return Number(BigInt(totalBalance)) / Number(MIST_PER_SUI);
}

export async function getChainSnapshot(address) {
  const [checkpoint, systemState, balance] = await Promise.all([
    client.getLatestCheckpointSequenceNumber(),
    client.getLatestSuiSystemState(),
    address
      ? client.getBalance({ owner: address })
      : Promise.resolve({ totalBalance: '0' }),
  ]);

  return {
    checkpoint: Number(checkpoint),
    epoch: Number(systemState.epoch),
    validators: systemState.activeValidators?.length ?? null,
    balanceSui: Number(BigInt(balance.totalBalance)) / Number(MIST_PER_SUI),
  };
}

/* ----------------------------- faucet ---------------------------- */

/**
 * Ask the testnet faucet for coins. It is rate limited and sometimes blocks
 * browser origins, so callers must handle a rejection.
 */
export async function fundFromFaucet(address) {
  const faucet = await import('@mysten/sui/faucet');
  const request =
    faucet.requestSuiFromFaucetV2 ||
    faucet.requestSuiFromFaucetV1 ||
    faucet.requestSuiFromFaucet;

  if (!request) throw new Error('Faucet helper unavailable in this SDK build.');

  return request({
    host: faucet.getFaucetHost(NETWORK),
    recipient: address,
  });
}

/* ---------------------------- transfer --------------------------- */

/**
 * Send SUI on testnet and wait for it to be indexed. Returns the digest —
 * a real, verifiable transaction id.
 */
export async function sendSui({ keypair, recipient, amountSui }) {
  const mist = BigInt(Math.round(Number(amountSui) * Number(MIST_PER_SUI)));
  if (mist <= 0n) throw new Error('Amount must be greater than zero.');
  if (!keypair) throw new Error('This account has no signing key yet. Reload and sign in again.');
  if (!isValidSuiAddress(recipient)) throw new Error('That is not a valid Sui address.');

  const sender = keypair.getPublicKey().toSuiAddress();

  const tx = new Transaction();
  tx.setSender(sender);

  const [coin] = tx.splitCoins(tx.gas, [mist]);
  tx.transferObjects([coin], recipient);

  try {
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true },
    });
    await client.waitForTransaction({ digest: result.digest });
    return result.digest;
  } catch (e) {
    throw new Error(explainSendFailure(e, sender));
  }
}

/** Turn an SDK error into a message that says what to do about it. */
function explainSendFailure(error, sender) {
  const text = String(error?.message ?? error);

  if (/failed to fetch|network|load failed|fetch failed/i.test(text)) {
    return 'Could not reach the Sui testnet node. Check your connection, or switch Live transfers off to continue in demo mode.';
  }
  if (/no valid gas coins|gascoins|insufficient|balance/i.test(text)) {
    return `This testnet account holds no SUI, so a live transfer cannot pay for itself. Fund ${sender.slice(0, 10)}… at faucet.sui.io, or switch Live transfers off.`;
  }
  if (/budget/i.test(text)) {
    return 'The testnet balance is too small to cover this transfer and its gas. Send a smaller amount, or add coins from faucet.sui.io.';
  }
  return `The transfer was rejected by the network: ${text}`;
}

export function isValidSuiAddress(a) {
  return typeof a === 'string' && /^0x[0-9a-fA-F]{64}$/.test(a.trim());
}
