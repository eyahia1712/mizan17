/**
 * Sui integration.
 *
 * Two things happen here, and it is worth being precise about which is which:
 *
 *   1. Chain reads  — always real. We query the public Sui testnet fullnode for
 *                     the current epoch, checkpoint and account balance.
 *   2. Transfers    — real when the app is in Live mode. We build a Sui
 *                     Transaction, sign it with a locally generated keypair and
 *                     submit it to testnet. The returned digest is a genuine
 *                     transaction you can open on the explorer.
 *
 * There is no backend. Sui is the backend. The browser talks to the fullnode
 * directly, which is the whole point of building this on-chain.
 *
 * Testnet coins have no monetary value. No real money moves anywhere.
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

export const NETWORK = 'testnet';
export const MIST_PER_SUI = 1_000_000_000n;

export const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

const KEY_STORAGE = 'mizan.demo.secretKey';

/** Namespaces the derivation so a subject id alone is not the whole seed. */
const APP_SALT = 'mizan:sui:testnet:v1';

/**
 * Derive the account keypair from a Google subject id.
 *
 * Deterministic on purpose: the same Google account produces the same Sui
 * address on any machine, so an account funded from the faucet once stays
 * usable. The seed is SHA-256 over the subject id and a fixed app salt.
 *
 * This stands in for zkLogin, which derives the address from the same
 * credential but proves it in zero knowledge and keeps no key in the browser.
 * Moving to zkLogin replaces this function and nothing else in the app.
 */
export async function keypairForSubject(sub) {
  const bytes = new TextEncoder().encode(`${APP_SALT}:${sub}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const seed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return Ed25519Keypair.deriveKeypairFromSeed(seed);
}

/**
 * A throwaway keypair for demo mode, reused within the browser session.
 * Used only when no Google client id is configured.
 */
export function loadOrCreateKeypair() {
  try {
    const saved = sessionStorage.getItem(KEY_STORAGE);
    if (saved) return Ed25519Keypair.fromSecretKey(saved);
  } catch {
    /* sessionStorage unavailable — fall through and mint a fresh key */
  }

  const kp = new Ed25519Keypair();
  try {
    sessionStorage.setItem(KEY_STORAGE, kp.getSecretKey());
  } catch {
    /* non-fatal */
  }
  return kp;
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/** The account's real, on-chain balance in SUI. */
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

/* ------------------------------------------------------------------ */
/* Faucet                                                              */
/* ------------------------------------------------------------------ */

/**
 * Ask the testnet faucet for coins. The faucet is rate limited and sometimes
 * blocks browser origins, so callers must handle rejection gracefully.
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

/* ------------------------------------------------------------------ */
/* Transfer                                                            */
/* ------------------------------------------------------------------ */

/**
 * Send SUI on testnet and wait for the transaction to be indexed.
 * Returns the digest — a real, verifiable transaction id.
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

/**
 * Turn the SDK's failures into something a person can act on. "Failed to
 * fetch" tells someone nothing about what to do next; "your testnet account is
 * empty, here is the faucet" tells them everything.
 */
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
