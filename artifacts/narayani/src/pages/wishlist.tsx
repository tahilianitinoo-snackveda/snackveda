import { Link } from "wouter";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { useBrowsingStore } from "@/lib/browsing";
import { useSeo } from "@/lib/seo";
import { Heart, Trash2 } from "lucide-react";

/**
 * /wishlist — spec point 12.
 *
 * Saved in the browser, not on the server: see the reasoning in lib/browsing.ts.
 * The short version is that most people who save something have not signed in, and
 * a wishlist that requires an account is a wishlist nobody uses.
 *
 * The page says out loud that the list is device-local. A shopper who saves six
 * things on their phone and finds an empty page on their laptop has been let down
 * by something that never told them how it worked.
 */
export default function Wishlist() {
  const wishlist = useBrowsingStore((s) => s.wishlist);
  const removeFromWishlist = useBrowsingStore((s) => s.removeFromWishlist);
  const clearWishlist = useBrowsingStore((s) => s.clearWishlist);

  useSeo({
    title: "Your Wishlist",
    description: "Products you have saved at Narayani Distributors.",
    canonical: "/wishlist",
    // Personal, per-device and different for everyone. Nothing here belongs in an index.
    noIndex: true,
  });

  return (
    <SiteShell>
      <div className="border-b bg-muted/30 py-12">
        <div className="container mx-auto max-w-4xl px-4">
          <h1 className="font-serif text-3xl font-bold md:text-4xl">Your wishlist</h1>
          <p className="mt-2 text-muted-foreground">
            {wishlist.length === 0
              ? "Nothing saved yet."
              : `${wishlist.length} ${wishlist.length === 1 ? "product" : "products"} saved on this device.`}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-12">
        {wishlist.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 py-20 text-center">
            <Heart className="mx-auto mb-4 h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-lg font-medium">Nothing here yet</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Tap the heart on any product to save it for later.
            </p>
            <Button className="mt-6 rounded-full" asChild>
              <Link href="/shop">Browse the range</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="divide-y rounded-2xl border bg-card">
              {wishlist.map((item) => (
                <li key={item.slug} className="flex items-center gap-4 p-4">
                  <Link href={`/shop/${item.slug}`} className="shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-20 w-20 rounded-xl border object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl border bg-muted text-center text-[10px] text-muted-foreground">
                        {item.name}
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/shop/${item.slug}`}
                      className="font-medium transition-colors hover:text-primary"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{item.weightGrams} g</p>
                    <Price amount={item.price} className="mt-1 block font-semibold" />
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" className="rounded-full" asChild>
                      <Link href={`/shop/${item.slug}`}>View</Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.name} from wishlist`}
                      onClick={() => removeFromWishlist(item.slug)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                Saved in this browser, on this device — it will not follow you to another
                phone or computer.
              </p>
              <Button variant="ghost" size="sm" onClick={clearWishlist}>
                Clear the list
              </Button>
            </div>
          </>
        )}
      </div>
    </SiteShell>
  );
}
