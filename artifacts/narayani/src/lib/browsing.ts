import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Wishlist and recently-viewed — spec point 12.
 *
 * ─── WHY THESE LIVE IN THE BROWSER AND NOT THE DATABASE ─────────────────────
 * Both are per-person conveniences, not records the business needs. Keeping them
 * local means they work for a signed-out visitor — which is most visitors, and
 * precisely the person a wishlist is meant to bring back — with no account, no
 * round trip and no row to clean up.
 *
 * The trade-off is honest and stated in the UI: a wishlist saved on a phone is not
 * there on a laptop. If it ever needs to follow an account, move it server-side
 * then; do not half-do it now by syncing only for signed-in users, which would
 * silently lose a signed-out visitor's list the moment they registered.
 *
 * Zustand's `persist` writes to localStorage. That can throw outright in a private
 * window or with site data blocked, so the store is built to work with an empty or
 * unavailable backing store rather than assuming it is there.
 */

export interface WishlistEntry {
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  weightGrams: number;
  addedAt: number;
}

export interface ViewedEntry {
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  viewedAt: number;
}

/** Enough to be useful on a return visit, few enough to render in one row. */
const MAX_RECENTLY_VIEWED = 8;

interface BrowsingState {
  wishlist: WishlistEntry[];
  recentlyViewed: ViewedEntry[];
  toggleWishlist: (entry: Omit<WishlistEntry, "addedAt">) => boolean;
  removeFromWishlist: (slug: string) => void;
  clearWishlist: () => void;
  isWishlisted: (slug: string) => boolean;
  recordView: (entry: Omit<ViewedEntry, "viewedAt">) => void;
}

export const useBrowsingStore = create<BrowsingState>()(
  persist(
    (set, get) => ({
      wishlist: [],
      recentlyViewed: [],

      /** Returns true when the product ended up ON the list, so the caller can say so. */
      toggleWishlist: (entry) => {
        const present = get().wishlist.some((w) => w.slug === entry.slug);
        set((state) => ({
          wishlist: present
            ? state.wishlist.filter((w) => w.slug !== entry.slug)
            : [{ ...entry, addedAt: Date.now() }, ...state.wishlist],
        }));
        return !present;
      },

      removeFromWishlist: (slug) =>
        set((state) => ({ wishlist: state.wishlist.filter((w) => w.slug !== slug) })),

      clearWishlist: () => set({ wishlist: [] }),

      isWishlisted: (slug) => get().wishlist.some((w) => w.slug === slug),

      /*
        Most recent first, no duplicates. Re-viewing something moves it to the front
        rather than adding a second copy — a list showing the same product four times
        because someone went back and forth is worse than no list.
      */
      recordView: (entry) =>
        set((state) => ({
          recentlyViewed: [
            { ...entry, viewedAt: Date.now() },
            ...state.recentlyViewed.filter((v) => v.slug !== entry.slug),
          ].slice(0, MAX_RECENTLY_VIEWED),
        })),
    }),
    {
      name: "narayani-browsing",
      // Only the data. The actions are recreated on every load, and persisting them
      // would write function stubs that come back as null and break the store.
      partialize: (state) => ({
        wishlist: state.wishlist,
        recentlyViewed: state.recentlyViewed,
      }),
    }
  )
);
