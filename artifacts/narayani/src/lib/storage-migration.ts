// One-time migration of persisted browser storage after the rebrand from
// SnackVeda to Narayani Distributors. Renaming the keys outright would sign
// every user out and empty every saved cart, so carry the old values over.
//
// Imported first in main.tsx, before the Zustand cart store is loaded, so the
// new keys are in place by the time anything reads them.

const MIGRATIONS: ReadonlyArray<readonly [legacy: string, current: string]> = [
  ["snackveda_token", "narayani_token"],
  ["snackveda-cart", "narayani-cart"],
];

for (const [legacy, current] of MIGRATIONS) {
  try {
    const value = localStorage.getItem(legacy);
    if (value === null) continue;
    if (localStorage.getItem(current) === null) {
      localStorage.setItem(current, value);
    }
    localStorage.removeItem(legacy);
  } catch {
    // Private browsing and blocked-storage modes throw on access. A skipped
    // migration only costs the user a fresh sign-in, so never break boot.
  }
}
