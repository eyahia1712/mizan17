/**
 * Who you can send to.
 *
 * Two ways to address a transfer, and the distinction is the whole point:
 *
 *   • a saved recipient — picked from a list, no address to type
 *   • a new one — the Sui address is required, because there is nothing else
 *     that can identify an account on chain
 *
 * Sending to a new address saves it, so it is only ever typed once.
 */

import { contacts } from '../data/mockData.js';
import { isValidSuiAddress } from './sui.js';

const KEY = 'mizan.recipients';

const shape = (r) => ({
  id: r.id ?? `r-${r.address.slice(2, 10)}`,
  name: (r.name || '').trim() || 'Saved address',
  address: r.address.trim(),
  handle: r.handle ?? null,
  rel: r.rel ?? null,
  saved: r.saved ?? false,
});

const seeded = () => contacts.map((c) => shape({ ...c, saved: false }));

function stored() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return (Array.isArray(raw) ? raw : [])
      .filter((r) => r?.address && isValidSuiAddress(r.address))
      .map((r) => shape({ ...r, saved: true }));
  } catch {
    return [];                                  // unreadable storage is not fatal
  }
}

/** Saved additions first — they are the ones this person actually chose. */
export function loadRecipients() {
  const all = [...stored(), ...seeded()];
  const byAddress = new Map();
  for (const r of all) {
    if (!byAddress.has(r.address.toLowerCase())) byAddress.set(r.address.toLowerCase(), r);
  }
  return [...byAddress.values()];
}

export function saveRecipient(recipient) {
  const next = shape({ ...recipient, saved: true });
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    const kept = (Array.isArray(raw) ? raw : [])
      .filter((r) => r?.address?.toLowerCase() !== next.address.toLowerCase());
    localStorage.setItem(KEY, JSON.stringify([next, ...kept]));
  } catch {
    /* non-fatal: it still works for this session */
  }
  return next;
}

export function forgetRecipient(address) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    localStorage.setItem(KEY, JSON.stringify(
      (Array.isArray(raw) ? raw : []).filter(
        (r) => r?.address?.toLowerCase() !== String(address).toLowerCase()
      )
    ));
  } catch {
    /* non-fatal */
  }
}

export const findRecipient = (address, list = loadRecipients()) =>
  list.find((r) => r.address.toLowerCase() === String(address).trim().toLowerCase()) ?? null;
